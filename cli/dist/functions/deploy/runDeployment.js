import fetch from "node-fetch";
import chalk from "chalk";
import AsciiTable from "ascii-table";
import _ from "lodash";
import fs from "fs";
import child_process from "child_process";
import FormData from "form-data";
import Loader from "../../lib/loader.js";
import domains from "./domains.js";
import checkIfValidJSON from "./checkIfValidJSON.js";
import CLILog from "../../lib/CLILog.js";
import rainbowRoad from "../../lib/rainbowRoad.js";
import build from "../build/index.js";
let checkDeploymentInterval;
const sslRecordsTable = new AsciiTable();
const checkDeploymentStatus = (deploymentId = "", deploymentToken = "", fingerprint = {}) => {
  try {
    return fetch(`${domains?.deploy}/api/deployments/status/${deploymentId}`, {
      method: "POST",
      headers: {
        "x-deployment-token": deploymentToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(fingerprint)
    }).then(async (response) => {
      const text = await response.text();
      const data = checkIfValidJSON(text);
      if (data?.error) {
        CLILog(data.error, {
          level: "danger",
          docs: "https://cheatcode.co/docs/deploy"
        });
        process.exit(0);
      }
      if (data.error) {
        return console.log(chalk.redBright(data.error));
      }
      return data;
    });
  } catch (exception) {
    throw new Error(`[runDeployment.checkDeploymentStatus] ${exception.message}`);
  }
};
const getAppSettings = () => {
  try {
    if (fs.existsSync("settings.production.json")) {
      const file = fs.readFileSync("settings.production.json", "utf-8");
      return JSON.parse(file);
    }
    return "{}";
  } catch (exception) {
    throw new Error(`[runDeployment.getAppSettings] ${exception.message}`);
  }
};
const startDeployment = (deploymentToken = "", deployment = {}, fingerprint = {}, deploymentTimestamp = "") => {
  try {
    return fetch(`${domains?.deploy}/api/deployments`, {
      method: "POST",
      headers: {
        "x-deployment-token": deploymentToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        ...fingerprint,
        ...deployment,
        deploymentTimestamp,
        settings: getAppSettings()
      })
    }).then(async (response) => {
      const text = await response.text();
      const data = checkIfValidJSON(text);
      if (data?.error) {
        CLILog(data.error, {
          level: "danger",
          docs: "https://cheatcode.co/docs/deploy"
        });
        process.exit(0);
      }
      if (data.error) {
        return console.log(chalk.redBright(data.error));
      }
      return data;
    });
  } catch (exception) {
    throw new Error(`[runDeployment.startDeployment] ${exception.message}`);
  }
};
const uploadBuildToObjectStorage = (timestamp = "", deploymentOptions = {}) => {
  try {
    const formData = new FormData();
    formData.append("build_tar", fs.readFileSync(`.build/build.tar.xz`), `${timestamp}.tar.xz`);
    formData.append("deployment", JSON.stringify(deploymentOptions?.deployment || {}));
    formData.append("fingerprint", JSON.stringify(deploymentOptions?.fingerprint || {}));
    return fetch(`${domains?.deploy}/api/deployments/upload`, {
      method: "POST",
      headers: {
        ...formData.getHeaders(),
        "x-deployment-token": deploymentOptions?.deploymentToken
      },
      body: formData
    }).then(async (response) => {
      const data = await response.json();
      return data;
    });
  } catch (exception) {
    throw new Error(`[runDeployment.uploadBuildToObjectStorage] ${exception.message}`);
  }
};
const buildApp = () => {
  try {
    return build({}, { isDeploy: true, type: "tar" });
  } catch (exception) {
    throw new Error(`[runDeployment.buildApp] ${exception.message}`);
  }
};
const validateOptions = (options) => {
  try {
    if (!options)
      throw new Error("options object is required.");
    if (!options.deploymentToken)
      throw new Error("options.deploymentToken is required.");
    if (!options.deployment)
      throw new Error("options.deployment is required.");
    if (!options.fingerprint)
      throw new Error("options.fingerprint is required.");
  } catch (exception) {
    throw new Error(`[runDeployment.validateOptions] ${exception.message}`);
  }
};
const runDeployment = async (options, { resolve, reject }) => {
  try {
    validateOptions(options);
    console.log("");
    const loader = new Loader({ padding: "  ", defaultMessage: "Deploying app..." });
    loader.text("Deploying app...");
    const deploymentTimestamp = new Date().toISOString();
    await buildApp();
    loader.text("Uploading built app to version control...");
    const uploadReponse = await uploadBuildToObjectStorage(deploymentTimestamp, options);
    if (uploadReponse?.error) {
      loader.stop();
      CLILog(uploadReponse?.error, {
        padding: "  ",
        level: "danger",
        docs: "https://cheatcode.co/docs/deploy/hosting-providers"
      });
    }
    loader.text("Starting deployment...");
    await startDeployment(options?.deploymentToken, options.deployment, options.fingerprint, deploymentTimestamp);
    checkDeploymentInterval = setInterval(async () => {
      const deploymentStatus = await checkDeploymentStatus(options?.deployment?.deploymentId, options?.deploymentToken, options?.fingerprint);
      loader.text(deploymentStatus?.log?.message);
      if (deploymentStatus?.deployment?.status === "deployed") {
        const loadBalancerInstances = deploymentStatus?.deployment?.instances?.filter((instance) => instance.type === "loadBalancer");
        loader.stop();
        clearInterval(checkDeploymentInterval);
        console.log(`  
  ${rainbowRoad()}

`);
        console.log(chalk.yellowBright(`  ${chalk.magenta(">>>")} Steps below MUST be completed in order to issue your SSL certificates and make your app live. ${chalk.magenta("<<<")}

`));
        console.log(chalk.white(`  ${chalk.yellowBright("1.")} Add a DNS record type A to the domain you deployed to for each of the Load Balancer IP addresses in the table below.
`));
        console.log(`  ${chalk.gray("------")}
`);
        console.log(`${sslRecordsTable.removeBorder().setHeading(chalk.magenta("#"), chalk.magenta("DNS Record Type"), chalk.magenta("Domain"), chalk.magenta("IP Address"), chalk.magenta("TTL")).addRowMatrix(_.sortBy(loadBalancerInstances, "name").map((loadBalancer, loadBalancerNumber) => {
          return [chalk.greenBright(loadBalancerNumber + 1), chalk.blueBright("A"), chalk.yellowBright(options?.deployment?.domain), chalk.greenBright(loadBalancer?.instance?.ip), chalk.white("As Low As Possible (1 minute)")];
        })).setAlign(0, AsciiTable.CENTER).setAlign(1, AsciiTable.CENTER).setAlign(2, AsciiTable.CENTER).setAlign(3, AsciiTable.CENTER).toString()}


  ${chalk.yellowBright(`Learn more about creating DNS records here: ${chalk.blueBright("https://cheatcode.co/docs/deploy/ssl")}`)}
        `);
        console.log(`  ${chalk.gray("------")}
`);
        console.log(chalk.white(`  ${chalk.yellowBright("2.")} Visit ${chalk.blueBright(`https://cheatcode.co/u/deployments/${options?.deployment?.domain}`)} and click the "Provision SSL Certificate" button.
`));
        console.log(chalk.white(`  ${chalk.yellowBright("3.")} If Step #2 fails, wait 5 minutes and try again until your certificate is provisioned.
`));
        console.log(chalk.white(`  ${chalk.yellowBright("4.")} If SSL fails to provision after multiple attempts, double-check your DNS configuration and try again.
`));
        console.log("\n");
      }
    }, 3e3);
  } catch (exception) {
    console.warn(exception);
    reject(`[runDeployment] ${exception.message}`);
  }
};
var runDeployment_default = (options) => new Promise((resolve, reject) => {
  runDeployment(options, { resolve, reject });
});
export {
  runDeployment_default as default
};
