use std::{
    fs::File,
    io::{self, BufReader},
    ops::{Deref, DerefMut},
    path::{Path, PathBuf},
};

use atomic_write_file::AtomicWriteFile;
use serde::{Serialize, de::DeserializeOwned};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum StateRepositoryError {
    #[error("state file at {0} not found")]
    FileNotFound(PathBuf),
    #[error(transparent)]
    Io(#[from] io::Error),
    #[error(transparent)]
    Serde(#[from] serde_json::Error),
}

pub struct StateRepository<T>
where
    T: Serialize + DeserializeOwned,
{
    path: PathBuf,
    state: T,
}

impl<T: Serialize + DeserializeOwned> StateRepository<T> {
    pub fn try_from_file(path: impl AsRef<Path>) -> Result<Self, StateRepositoryError> {
        let file = match File::open(path.as_ref()) {
            Ok(f) => f,
            Err(e) if e.kind() == io::ErrorKind::NotFound => {
                return Err(StateRepositoryError::FileNotFound(path.as_ref().into()));
            }
            Err(e) => return Err(e.into()),
        };
        let reader = BufReader::new(file);
        let state = serde_json::from_reader(reader)?;

        let repo = Self {
            path: path.as_ref().into(),
            state,
        };

        // Upon creating the repo, immediately try to save to file. This ensures we have write
        // permissions and that all new fields have their default values generated
        repo.try_save_file()?;
        Ok(repo)
    }

    pub fn try_save_file(&self) -> Result<(), StateRepositoryError> {
        let mut file = AtomicWriteFile::open(&self.path)?;
        serde_json::to_writer(&mut file, &self.state)?;
        file.commit()?;
        Ok(())
    }
}

impl<T: Serialize + DeserializeOwned + Default> StateRepository<T> {
    /// Generates a new default [T] and saves it to the provided path
    pub fn new_save_default(path: impl AsRef<Path>) -> Result<Self, StateRepositoryError> {
        let repo = Self {
            path: path.as_ref().into(),
            state: T::default(),
        };
        repo.try_save_file()?;
        Ok(repo)
    }
}

impl<T: Serialize + DeserializeOwned> Deref for StateRepository<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.state
    }
}

impl<T: Serialize + DeserializeOwned> DerefMut for StateRepository<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.state
    }
}
