use std::{
    io,
    path::{Path, PathBuf},
};

use anyhow::Context;
use atomic_write_file::AtomicWriteFile;
use chrono::NaiveDate;
use garde::Validate;
use serde::{Deserialize, Serialize};
use thiserror::Error;

use crate::repository::{StateRepository, StateRepositoryError};

pub fn create_repo(state_dir: impl AsRef<Path>) -> anyhow::Result<StateRepository<RecordsState>> {
    let state_dir = state_dir.as_ref();
    let file_path = state_dir.join("records.json");
    let mut repo: StateRepository<RecordsState> =
        match StateRepository::try_from_file(file_path.clone()) {
            Ok(r) => r,
            Err(StateRepositoryError::FileNotFound(p)) => {
                log::warn!(
                    "Records state at {p:?} does not exist, attempting to create default file"
                );
                StateRepository::new_save_default(p)
                    .context("Failed to create default records state file")?
            }
            Err(e) => return Err(e).context("Unable to load records state file"),
        };

    // Records state also needs STATE_DIR/cache/records directory to exist
    let rec_cache_dir = state_dir.join("cache/records");
    std::fs::create_dir_all(&rec_cache_dir).with_context(|| {
        format!(
            "Unable to create {} directory",
            rec_cache_dir.to_string_lossy()
        )
    })?;
    repo.cache_dir = rec_cache_dir;

    Ok(repo)
}

#[derive(Debug, Error)]
pub enum RecordsStateError {
    #[error("New record {0} is missing field: {1}")]
    MissingField(NaiveDate, String),
    #[error("No existing recommendation found with date: {0}")]
    NotFound(NaiveDate),
    #[error("Record {0} is invalid: {1}")]
    ValidationError(NaiveDate, #[source] garde::Report),
    #[error("Failed to run scraper: {0}")]
    ScraperError(#[source] io::Error),
    #[error("Failed to parse scraper output: {0}")]
    ScraperOutputFormatError(#[source] serde_json::Error),
}

#[derive(Debug, Error)]
enum RecordsCacheError {
    #[error("File not found")]
    FileNotFound,
    #[error(transparent)]
    DeserializationError(#[from] serde_json::Error),
    #[error(transparent)]
    Io(#[from] io::Error),
}

#[derive(Debug, Serialize, Deserialize, Clone, Default, Validate)]
#[garde(allow_unvalidated)]
#[serde(rename_all = "camelCase")]
pub struct RecommendationRecord {
    pub date: NaiveDate,
    #[garde(length(min = 1))]
    pub member: String,
    #[garde(inner(length(min = 1)))]
    pub recommendations: [String; 3],
    #[garde(custom(validate_winner_in_recommendations(&self.recommendations)))]
    pub winner: Option<String>,
    #[garde(range(min = 0, max = 100))]
    pub external_odds: Option<u32>,
}

/// Ensure that when winner is `Some(w)`, then `w` is a value contained in the `recommendations`
/// slice.
fn validate_winner_in_recommendations(
    recommendations: &[String],
) -> impl FnOnce(&Option<String>, &()) -> garde::Result {
    move |winner, _| {
        if let Some(winner) = winner
            && !recommendations.contains(winner)
        {
            Err(garde::Error::new(
                "value not found in list of recommendations",
            ))
        } else {
            Ok(())
        }
    }
}

impl RecommendationRecord {
    fn new_with_slim(old: Self, slim: SlimRecommendationRecord) -> Self {
        Self {
            date: old.date,
            member: slim.member.unwrap_or(old.member),
            recommendations: slim.recommendations.unwrap_or(old.recommendations),
            winner: slim.winner.unwrap_or(old.winner),
            external_odds: slim.external_odds.unwrap_or(old.external_odds),
        }
    }
}

impl TryFrom<SlimRecommendationRecord> for RecommendationRecord {
    type Error = RecordsStateError;

    fn try_from(value: SlimRecommendationRecord) -> Result<Self, Self::Error> {
        Ok(Self {
            date: value.date,
            member: value
                .member
                .ok_or(RecordsStateError::MissingField(value.date, "member".into()))?,
            recommendations: value
                .recommendations
                .ok_or(RecordsStateError::MissingField(
                    value.date,
                    "recommendations".into(),
                ))?,
            winner: value
                .winner
                .ok_or(RecordsStateError::MissingField(value.date, "winner".into()))?,
            external_odds: value.external_odds.ok_or(RecordsStateError::MissingField(
                value.date,
                "external_odds".into(),
            ))?,
        })
    }
}

/// Used to update some fields from a [RecommendationRecord], without modifying the unspecified
/// fields. Makes use of double option, where `None` is a missing/unspecified field, and
/// `Some(None)` is a field that was set to `null` in the JSON. `date` is non-optional as it is the
/// key we used to compare this struct to another existing [RecommendationRecord].
#[derive(Debug, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct SlimRecommendationRecord {
    pub date: NaiveDate,
    pub member: Option<String>,
    pub recommendations: Option<[String; 3]>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub winner: Option<Option<String>>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub external_odds: Option<Option<u32>>,
}

impl From<RecommendationRecord> for SlimRecommendationRecord {
    fn from(value: RecommendationRecord) -> Self {
        Self {
            date: value.date,
            member: Some(value.member),
            recommendations: Some(value.recommendations),
            winner: Some(value.winner),
            external_odds: Some(value.external_odds),
        }
    }
}

// TODO: With `cache_dir`, RecordsState now has some non-state related information.
// We should separate our concerns and create a new `RecordsService` struct that owns the
// StateRepo<RecordsState> as well as the cache dir path.
#[derive(Debug, Serialize, Deserialize, Clone, Default)]
pub struct RecordsState {
    recommendations: RecommendationList,
    #[serde(skip, default)]
    cache_dir: PathBuf,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct RecommendationList(Vec<RecommendationRecord>);

impl RecommendationList {
    /// Attempts to either:
    /// - Add a new recommendation to the list
    /// - Modify an existing recommendation if another recommendation already exists with the same
    ///   date
    pub fn try_push(
        &mut self,
        new_slim: SlimRecommendationRecord,
    ) -> Result<(), RecordsStateError> {
        if let Some(existing) = self.0.iter_mut().find(|r| r.date == new_slim.date) {
            // Updating existing and check if the record is still valid
            let new_rec = RecommendationRecord::new_with_slim(existing.clone(), new_slim);
            new_rec
                .validate()
                .map_err(|e| RecordsStateError::ValidationError(new_rec.date, e))?;
            *existing = new_rec;
        } else {
            // Check if "slim" has all fields and insert in list if it does
            let recommendation: RecommendationRecord = new_slim.try_into()?;
            recommendation
                .validate()
                .map_err(|e| RecordsStateError::ValidationError(recommendation.date, e))?;
            self.0.push(recommendation);
        }
        Ok(())
    }

    pub fn try_remove(&mut self, date: NaiveDate) -> Result<(), RecordsStateError> {
        if let Some(idx) = self.0.iter().position(|r| r.date == date) {
            self.0.remove(idx);
            Ok(())
        } else {
            Err(RecordsStateError::NotFound(date))
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RecommendationDetails {
    slug: String,
    poster_url: String,
    title: String,
    year: u32,
}

impl RecommendationDetails {
    /// Attempts to generate the recommendation details for the specified slug by calling the
    /// scraper.
    pub async fn try_from_slugs(slugs: &[String]) -> Result<Vec<Self>, RecordsStateError> {
        let slugs = slugs.join(",");
        let output = tokio::process::Command::new("movie-club-scraper")
            .args(["movies", &slugs])
            .output()
            .await
            .map_err(RecordsStateError::ScraperError)?;

        if output.status.success() {
            let parsed: Vec<Self> = serde_json::from_slice(&output.stdout)
                .map_err(RecordsStateError::ScraperOutputFormatError)?;
            Ok(parsed)
        } else {
            let stderr = String::from_utf8_lossy(&output.stderr);
            log::error!("Scraper returned non-zero exit code: {stderr}");
            Err(RecordsStateError::ScraperError(io::Error::other(format!(
                "exit code {:?}",
                output.status.code()
            ))))
        }
    }
}

impl RecordsState {
    pub fn recommendations(&self) -> &[RecommendationRecord] {
        &self.recommendations.0
    }

    pub fn try_add_recommendations(
        &mut self,
        extra_recommendations: Vec<SlimRecommendationRecord>,
    ) -> Result<(), RecordsStateError> {
        let mut new_recommendations = self.recommendations.clone();

        for extra in extra_recommendations {
            let date = extra.date;
            new_recommendations.try_push(extra)?;
            // In case a rec was modified, delete its cached detailed file
            let _ = self.delete_recommendation_details_file(date);
        }

        self.recommendations = new_recommendations;
        Ok(())
    }

    pub fn try_remove_recommendations(
        &mut self,
        removing_dates: Vec<NaiveDate>,
    ) -> Result<(), RecordsStateError> {
        for date in removing_dates {
            self.recommendations.try_remove(date)?;
            // Delete the cached details file to clean up disk space
            let _ = self.delete_recommendation_details_file(date);
        }
        Ok(())
    }

    /// Returns extra details regarding a recommendation that isn't included in
    /// [RecommendationRecord]. This includes title, year and poster URLs for every movie in a
    /// recommendation.
    pub async fn get_recommendation_details(
        &self,
        date: NaiveDate,
    ) -> Result<Vec<RecommendationDetails>, RecordsStateError> {
        // Check if record exists, and only after attempt to load cached details
        let rec = self
            .recommendations
            .0
            .iter()
            .find(|r| r.date == date)
            .ok_or(RecordsStateError::NotFound(date))?;

        match self.load_recommendation_details_file(date).await {
            Ok(details) => return Ok(details),
            Err(RecordsCacheError::FileNotFound) => {
                log::info!("Cached details for recommendation {date} not found")
            }
            Err(RecordsCacheError::DeserializationError(e)) => {
                log::warn!("Failed to deserialize cached recommendation details for {date}: {e}")
            }
            Err(RecordsCacheError::Io(e)) => {
                log::error!("IO error while reading cached recommendation details for {date}: {e}")
            }
        };

        log::info!("Generating details for recommendation {date}");
        let recs = RecommendationDetails::try_from_slugs(&rec.recommendations).await?;
        let _ = self
            .save_recommendation_details_file(date, &recs)
            .inspect_err(|e| log::error!("Failed to write details cache file: {e}"));

        Ok(recs)
    }

    async fn load_recommendation_details_file(
        &self,
        date: NaiveDate,
    ) -> Result<Vec<RecommendationDetails>, RecordsCacheError> {
        let file_name = format!("recommendations_{date}.json");
        let file_path = self.cache_dir.join(file_name);

        let contents = match tokio::fs::read(file_path).await {
            Ok(s) => s,
            Err(e) if e.kind() == io::ErrorKind::NotFound => {
                return Err(RecordsCacheError::FileNotFound);
            }
            Err(e) => return Err(e.into()),
        };

        serde_json::from_slice(&contents).map_err(Into::into)
    }

    fn save_recommendation_details_file(
        &self,
        date: NaiveDate,
        recs: &[RecommendationDetails],
    ) -> io::Result<()> {
        let file_name = format!("recommendations_{date}.json");
        let file_path = self.cache_dir.join(file_name);
        let mut file = AtomicWriteFile::open(file_path)?;
        serde_json::to_writer(&mut file, recs)?;
        file.commit()?;

        Ok(())
    }

    fn delete_recommendation_details_file(&self, date: NaiveDate) -> io::Result<()> {
        let file_name = format!("recommendations_{date}.json");
        let file_path = self.cache_dir.join(file_name);
        std::fs::remove_file(file_path)
    }
}

#[cfg(test)]
mod test {
    use super::*;

    fn valid_recommendation_record() -> RecommendationRecord {
        RecommendationRecord {
            date: NaiveDate::from_ymd_opt(1, 1, 1).unwrap(),
            member: "member".into(),
            recommendations: ["rec1".into(), "rec2".into(), "rec3".into()],
            winner: Some("rec1".into()),
            external_odds: Some(100),
        }
    }

    /// `try_add_recommendations` adds a new rec when the slim contains all fields
    #[test]
    fn try_add_recommendations_works_when_slim_is_full() {
        let mut state = RecordsState::default();

        let full_slim = SlimRecommendationRecord {
            date: Default::default(),
            member: Some("member".into()),
            recommendations: Some(["rec1".into(), "rec2".into(), "rec3".into()]),
            winner: Some(None),
            external_odds: Some(Some(0)),
        };

        // Sanity check
        let _: RecommendationRecord = full_slim
            .clone()
            .try_into()
            .expect("should not fail - does the struct above have any missing/None fields?");

        state
            .try_add_recommendations(vec![full_slim])
            .expect("should not fail");

        assert_eq!(state.recommendations.0.len(), 1);
    }

    /// `try_add_recommendations` modifies an existing recommendation record if one exists with the
    /// same date.
    #[test]
    fn try_add_recommendations_modifies_existing_recommendation() {
        let mut state = RecordsState::default();
        let date = NaiveDate::from_ymd_opt(1, 1, 1).unwrap();
        // Add record
        state
            .try_add_recommendations(vec![
                RecommendationRecord {
                    date,
                    member: "foo".into(),
                    external_odds: Some(5),
                    ..valid_recommendation_record()
                }
                .into(),
            ])
            .unwrap();

        let slim = SlimRecommendationRecord {
            date,
            member: Some("bar".into()),
            ..Default::default()
        };
        state
            .try_add_recommendations(vec![slim])
            .expect("should not fail");

        // Assert that only recommendation has the new member value, and that external odds haven't
        // changed.
        assert_eq!(
            state.recommendations.0.first().unwrap().member,
            "bar".to_string()
        );
        assert_eq!(
            state.recommendations.0.first().unwrap().external_odds,
            Some(5)
        );
    }

    /// `try_add_recommendations` returns an error when the provided slim record has a new date,
    /// but not all fields are defined.
    #[test]
    fn try_add_recommendations_errs_when_new_date_missing_fields() {
        let mut state = RecordsState::default();

        let partial_slim = SlimRecommendationRecord {
            date: NaiveDate::from_ymd_opt(1, 1, 1).unwrap(),
            member: Some("foo".into()),
            ..Default::default()
        };

        state
            .try_add_recommendations(vec![partial_slim])
            .expect_err("call should fail");
    }

    /// `try_remove_recommendations` removes the recommendations if they exist.
    #[test]
    fn try_remove_recommendations_removes_records() {
        let mut state = RecordsState::default();
        let date1 = NaiveDate::from_ymd_opt(1, 1, 1).unwrap();
        let date2 = NaiveDate::from_ymd_opt(2, 2, 2).unwrap();

        let rec1 = RecommendationRecord {
            date: date1,
            ..valid_recommendation_record()
        };
        let rec2 = RecommendationRecord {
            date: date2,
            ..valid_recommendation_record()
        };
        state
            .try_add_recommendations(vec![rec1.into(), rec2.into()])
            .unwrap();

        state
            .try_remove_recommendations(vec![date1, date2])
            .expect("call should not fail");
        assert_eq!(state.recommendations.0.len(), 0);
    }

    #[test]
    fn recommendation_record_validation_accepts_valid_struct() {
        let recommendation_record = RecommendationRecord {
            date: NaiveDate::from_ymd_opt(1, 1, 1).unwrap(),
            member: "foo".into(),
            recommendations: ["1".into(), "2".into(), "3".into()],
            winner: Some("1".into()),
            external_odds: Some(0),
        };

        recommendation_record
            .validate()
            .expect("validation shouldn't fail");
    }

    #[test]
    fn recommendation_record_validation_errs_on_empty_member_name() {
        let recommendation_record = RecommendationRecord {
            date: NaiveDate::from_ymd_opt(1, 1, 1).unwrap(),
            member: "".into(),
            recommendations: ["1".into(), "2".into(), "3".into()],
            winner: Some("1".into()),
            external_odds: Some(0),
        };

        recommendation_record
            .validate()
            .expect_err("validation should fail");
    }

    #[test]
    fn recommendation_record_validation_errs_on_empty_recommendation_value() {
        let recommendation_record = RecommendationRecord {
            date: NaiveDate::from_ymd_opt(1, 1, 1).unwrap(),
            member: "foo".into(),
            recommendations: ["1".into(), "".into(), "3".into()],
            winner: Some("1".into()),
            external_odds: Some(0),
        };

        recommendation_record
            .validate()
            .expect_err("validation should fail");
    }

    /// The winner value, if Some, must be a value found in the recommendations array
    #[test]
    fn recommendation_record_validation_errs_on_wrong_winner() {
        let recommendation_record = RecommendationRecord {
            date: NaiveDate::from_ymd_opt(1, 1, 1).unwrap(),
            member: "foo".into(),
            recommendations: ["1".into(), "2".into(), "3".into()],
            winner: Some("newvalue".into()),
            external_odds: Some(0),
        };

        recommendation_record
            .validate()
            .expect_err("validation should fail");

        // Validation shouldn't fail when winner is none
        let recommendation_record = RecommendationRecord {
            date: NaiveDate::from_ymd_opt(1, 1, 1).unwrap(),
            member: "foo".into(),
            recommendations: ["1".into(), "2".into(), "3".into()],
            winner: None,
            external_odds: Some(0),
        };

        recommendation_record
            .validate()
            .expect("validation shouldn't fail");
    }

    #[test]
    fn recommendation_record_validation_errs_on_external_odds_out_of_range() {
        // None is always ok
        let recommendation_record = RecommendationRecord {
            date: NaiveDate::from_ymd_opt(1, 1, 1).unwrap(),
            member: "foo".into(),
            recommendations: ["1".into(), "2".into(), "3".into()],
            winner: Some("1".into()),
            external_odds: None,
        };
        recommendation_record
            .validate()
            .expect("validation shouldn't fail");

        let recommendation_record = RecommendationRecord {
            date: NaiveDate::from_ymd_opt(1, 1, 1).unwrap(),
            member: "foo".into(),
            recommendations: ["1".into(), "2".into(), "3".into()],
            winner: Some("1".into()),
            external_odds: Some(101),
        };
        recommendation_record
            .validate()
            .expect_err("validation should fail");
    }
}
