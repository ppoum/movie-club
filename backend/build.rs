fn main() {
    if option_env!("FRONTEND_DIST_DIR").is_none() {
        // Variable not defined, set it to "../dist"
        println!("cargo:rustc-env=FRONTEND_DIST_DIR=\"../dist\"");
    }

    println!("cargo:rerun-if-changed=build.rs");
}
