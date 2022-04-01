import fs from 'fs';
import os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';
import CLILog from '../../lib/CLILog.js';
import writeDeploymentTokenToDisk from '../../lib/writeDeploymentTokenToDisk.js';
import isValidJSONString from '../../lib/isValidJSONString.js';
import prompts from './prompts.js';
import getDeployment from '../../lib/getDeployment.js';
import getMachineFingerprint from '../../lib/getMachineFingerprint.js';
import getDeploymentSummary from './getDeploymentSummary.js';
import providerMap from './providerMap.js';
import Loader from '../../lib/loader.js';
import initDeployment from './initDeployment.js';
import updateDeployment from './updateDeployment.js';
import getDeploymentToken from '../../lib/getDeploymentToken.js';

const handleInitialDeployment = async ({
  deploymentFromServer = {},
  deploymentToken = '',
  fingerprint = {},
  domain = '',
}) => {
  try {
    const loader = new Loader({ padding: ' ', defaultMessage: "" });
    const deploymentToExecute = await inquirer.prompt(prompts.initialDeployment(deploymentFromServer?.user, deploymentToken, fingerprint));

    console.log("\n");
    loader.text("Building deployment summary...");

    const deploymentSummary = await getDeploymentSummary(deploymentToExecute, deploymentToken, fingerprint);

    loader.stop();

    const totalInstancesRequested = deploymentToExecute?.loadBalancerInstances + deploymentToExecute?.appInstances;
    const deploymentFeasible = totalInstancesRequested <= deploymentSummary?.limits?.available;

    if (!deploymentFeasible) {
      CLILog(`${chalk.yellowBright(`Cannot deploy with this configuration as it would exceed the limits set by your selected provider (${providerMap[deploymentToExecute?.provider]}).`)} Your account there is limited to ${deploymentSummary?.limits?.account} instances (currently using ${deploymentSummary?.limits?.existing}).\n\n You requested ${totalInstancesRequested} instances which would go over your account limit. Please adjust your configuration (or request an increase from your provider) and try again.`, {
        padding: ' ',
        level: 'danger',
        docs: 'https://cheatcode.co/docs/deploy/provider-limits',
      });
      process.exit(0);
    }

    const { confirmation } = await inquirer.prompt(
      prompts.confirmInitialDeployment(deploymentToExecute, deploymentSummary?.costs)
    );

    if (confirmation) {
      await initDeployment({
        deploymentToken,
        deployment: {
          deploymentId: deploymentFromServer?.deployment?._id,
          domain,
          ...deploymentToExecute
        },
        fingerprint,
      });

      loader.stable('Deployment complete!');
      loader.stop();

      return;
    }
  } catch (exception) {
    throw new Error(`[deploy.handleInitialDeployment] ${exception.message}`);
  }
};

export default async (args = {}, options = {}) => {
  try {
    const hasJoystickFolder = fs.existsSync('.joystick');

    if (!hasJoystickFolder) {
      CLILog('This is not a Joystick project. A .joystick folder could not be found.', {
        level: 'danger',
        docs: 'https://github.com/cheatcode/joystick',
      });
      
      process.exit(0);
    }
    
    const deploymentToken = await getDeploymentToken(options);
  
    let domain = options?.domain;
  
    if (!options?.domain) {
      domain = await inquirer.prompt(prompts.domain()).then((answers) => answers?.domain);
    }
  
    const fingerprint = await getMachineFingerprint();
    const deploymentFromServer = await getDeployment(domain, deploymentToken, fingerprint);
    const isInitialDeployment = deploymentFromServer?.deployment?.status === 'undeployed';

    if (isInitialDeployment) {
      await handleInitialDeployment({
        deploymentFromServer,
        deploymentToken,
        fingerprint,
        domain,
      });

      return;
    }

    await updateDeployment({
      deploymentToken,
      deployment: {
        ...(deploymentFromServer?.deployment || {}),
        deploymentId: deploymentFromServer?.deployment?._id,
      },
      fingerprint,
    });
  } catch (exception) {
    throw new Error(`[deploy] ${exception.message}`);
  }
};


// import loginToCheatCode from './lib/loginToCheatCode.js';
// import prompts from './lib/prompts.js';
// import getDeployment from './lib/getDeployment.js';

// // TODO: If no existing token file or user login, prompt and ask: "How do you want to login? [Token, Email/Password]"
// // When someone uses a token, record their mac address. If they reach a limit of machines, they can upgrade.
// // 
// // Deployment tokens will be generated by the subscription owner on their account. They can generate up to the alotted number and label each one. Also give an option to email the token to a developer.
// // Deploy Startup ($29/mo) = Up to 5 Users // Deploy Small Business ($39/mo) = Up to 10 // Deploy Enterprise ($199/mo) = Unlimited Users  // Deploy Forever?

// const login = await inquirer.prompt(prompts.login()).then((answers) => answers);
// const account = await loginToCheatCode(login?.emailAddress, login?.password);

// if (!account) {
//   console.log('\n');
//   process.exit(0);
// }

// const domain = await inquirer.prompt(prompts.domain()).then((answers) => answers?.domain);
// const deployment = await getDeployment(domain, account?.cookies);

// if (deployment?.status === 'undeployed') {
//   const deploymentToExecute = await inquirer.prompt(prompts.initialDeployment(account?.user));
//   console.log(deploymentToExecute);

//   // NOTE: Initial deployment involves: creating servers, uploading/unpacking code, installing dependencies, and setting up the config scripts.
//   // After install, prompt user to run joystick deployment <domain> ssl or visit the dashboard to generate
//   // their SSL certs (this talks to the load balancers, runs certbot, and then shares the cert between each load balancer)

//   // TODO: Initial provisioning takes ~2 minutes for most deployments. After that's complete,
//   // you will be prompted to update your DNS records and provision your SSL certificate.

//   // TODO: When the provisioning step is finished, have a big warning that says
//   /*
//     In order to complete deployment, please add the following DNS records to your domain and the run joystick deployment cheatcode.co ssl
//     to provision your SSL certificates.

//     Type  Domain Name   IP Address    TTL
//     -------------------------------------------------------------------------
//     A     cheatcode.co  192.168.1.1   Lowest Possible Value
//     A     cheatcode.co  192.168.1.2   Lowest Possible Value

//   */
// }