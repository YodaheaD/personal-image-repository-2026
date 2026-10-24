/**
 * Azure App Service entry for Next.js standalone output.
 * Ensures HOSTNAME/PORT before loading the generated server.js.
 */
"use strict";

const path = require("path");

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || process.env.HOST || "0.0.0.0";
process.env.PORT = process.env.PORT || "8080";

const serverPath = path.join(__dirname, "server.js");
require(serverPath);
