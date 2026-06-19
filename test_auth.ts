import bcrypt from "bcryptjs";
console.log(bcrypt.compareSync("hassan321", "$2b$10$VSo0trMMkm/Ud1W7HMIEOODAJE3pgwPURKuYlk15aMwp7xaOVSv1."));
console.log(bcrypt.compareSync("admin123", "$2b$10$VSo0trMMkm/Ud1W7HMIEOODAJE3pgwPURKuYlk15aMwp7xaOVSv1."));
