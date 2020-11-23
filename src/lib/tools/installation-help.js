const yarnDependenciesInstalledButNotRecognized = (toolName, versionCommand) => `<li>
  <strong>Is ${toolName} already installed but not recognized by the Desktop App?</strong>
  <div>
    If yes, make sure the folder containing it has been added to your PATH.
    <div>
    <strong>Verifying that it worked:</strong>
    Go to your terminal and execute '<code>${versionCommand}</code>'. Found a version number? This version should now also be visible inside the Desktop App.
    </div>
  </div>
</li>
<br>`;

const installationErrorForYarnDependencies = toolName => `<li>
  <strong>Error during installation?</strong>
  <div>
    If this was not a PATH problem, please find the relevant error and its solution below:
    <ul class="slds-is-nested slds-list_dotted">
      <li>
        <strong>Permission denied</strong>
        <div>
          <strong>Solution:</strong>
          Go to the '<mark>Configuration Settings</mark>' for '<mark>Yarn</mark>'. Make sure your configuration settings are set as per the recommended values, and then click the Install button for ${toolName} again.
        </div>
      </li>
      <li>
        <strong>Make sure you have correct prefix set for Yarn</strong>
        <div>
          <strong>Solution:</strong>
          Go to terminal and execute '<code>yarn config get prefix</code>'. It should point to '<mark>.yarn</mark> folder in your home directory. If not, go to the '<mark>Configuration Settings</mark>' for '<mark>Yarn</mark>'. Make sure your configuration settings are set as per the recommended values, and then click the Install button for ${toolName} again.
        </div>
      </li>
      <li>
        <strong>code ENOENT/ENOTEMPTY</strong>
        <div>
          <strong>Solution:</strong>
          When you try installing various Yarn packages simultaneously, sometimes two or more packages try to update the lock file at the same time which then causes errors. Ensure that no other package is being installed at the same time; and then try clicking the <strong>Install</strong> button again.
        </div>
      </li>
    </ul>
  </div>
  </li>
  <br>`;

const manualWorkaroundForYarnDependencies = (toolToInstall, versionCommand) => `<li>
  <strong>Nothing else works?</strong>
  <div>
    <strong>Manual workaround:</strong>
    Go to your terminal and execute '<code>yarn global remove ${toolToInstall}</code>'. Now clear the cache by running '<code>yarn cache clean</code>'. And then again try installing the tool by executing '<code>yarn global add ${toolToInstall}</code>'. Check for the version number by executing '<code>${versionCommand}</code>'. If it returns the version number that means the tool is successfully installed in the system. You should now see the current version of the tool in the Desktop App.
  </div>
  </li>
  <br>`;

const behindProxy = toolName => `<li>
  <strong>Behind a proxy?</strong>
  <div>
    You need to set your proxy settings before proceeding further. Set the proxy settings and re-try installing/updating the tool. You can refer our documentation site to <a href="https://dx.appirio.com/tools/proxy-settings/">Set Up Proxies</a>.
    <div>
    <strong>Verifying that it worked:</strong>
    Re-open the '<mark>Desktop App</mark>' and ensure you can see the version number for ${toolName}.
    </div>
  </div>
</li>
<br>`;

const installedButNotRecognized = (toolName, isVSCode = false) => `<li>
  <strong>Is ${toolName} already installed but not recognized by the Desktop App?</strong>
  <div>
    Make sure the folder containing ${toolName} has been added to your PATH. ${isVSCode ? '<a href="https://code.visualstudio.com/docs/setup/setup-overview">Find instructions here</a>.' : ''}
    <div>
    <strong>Verifying that it worked:</strong>
    Re-open the '<mark>Desktop App</mark>' and ensure you can see the version number for ${toolName}.
    </div>
  </div>
</li>
<br>`;

const manualWorkaround = manualInstallUrl => `<li>
  <strong>Nothing else works?</strong>
  <div>
    <strong>Manual workaround:</strong>
    You can try <a href="${manualInstallUrl}">installing</a> the tool manually. After installation, you may need to add it to your PATH.
  </div>
</li>
<br>`;

const javaDependencyErrorForPMD = () => `<li>
  <strong>An unsatisfied requirement failed this build.</strong>
  <div>
    <strong>Solution:</strong>
    You need a minimum of '<mark>Java 1.8</mark>' to install PMD. <a href="https://www.oracle.com/technetwork/java/javase/downloads/index.html"> Install Java</a> manually and retry the PMD installation.
  </div>
</li>
<br>`;

const installationErrorForMac = (toolName, toolToInstall, versionCommand, isPMD = false) => `<li>
  <strong>Error during installation?</strong>
  <div>
    If this was not a PATH problem, please find the relevant error and its solution below:
    <ul class="slds-is-nested slds-list_dotted">
      ${isPMD ? javaDependencyErrorForPMD() : ''}
      <li>
        <strong>The \`brew link\` step did not complete successfully OR Permission Denied OR Couldn't symlink OR Operation not permitted</strong>
        <div>
          <strong>Solution:</strong>
          Try executing '<code>chown -R $(whoami) $(brew --prefix)/*</code>' from your terminal. On successful execution of this command, try running '<code>brew link --overwrite ${toolToInstall}</code>'.
        </div>
        <div>
          <strong>Verifying that it worked:</strong>
          Execute '<code>${versionCommand}</code>' from terminal. If the installed version appears then the tool has been successfully installed.
        </div>
      </li>
      <li>
        <strong>${toolName} is already installed</strong>
        <div>
          <strong>Solution:</strong>
          Try executing '<code>brew upgrade ${toolToInstall}</code>' from the terminal.'.
        </div>
        <div>
          <strong>Verifying that it worked:</strong>
          Execute '<code>${versionCommand}</code>' from terminal. If the installed version appears then the tool has been successfully installed.
        </div>
      </li>
    </ul>
  </div>
</li>
<br>`;

const manualWorkaroundForToolsWithSettings = (toolName, manualInstallUrl) => `<li>
    <strong>Nothing else works?</strong>
    <div>
      <strong>Manual workaround:</strong>
      You can try <a href="${manualInstallUrl}">installing</a> the tool manually. You may need to add it to your PATH after installation. After installing, make sure to come back and set all the '<mark>Configuration settings</mark>' for ${toolName} to their '<mark>Recommended Values</mark>'.
    </div>
  </li>
  <br>`;

module.exports = {
  yarnDependenciesInstalledButNotRecognized,
  installationErrorForYarnDependencies,
  manualWorkaroundForYarnDependencies,
  behindProxy,
  installedButNotRecognized,
  manualWorkaround,
  installationErrorForMac,
  manualWorkaroundForToolsWithSettings,
  javaDependencyErrorForPMD,
};
