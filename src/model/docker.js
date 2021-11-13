import { exec } from '@actions/exec';
import ImageTag from './image-tag';
import fs from 'fs';

class Docker {
  static async build(buildParameters, silent = false) {
    const { path, dockerfile, baseImage } = buildParameters;
    const { version } = baseImage;

    const buildX = "buildx";
    //const buildX = undefined;
    const iidFile = "./iidfile";
    const metaFile = "./metafile";
    const tag = ImageTag.createForAction(version);
    var command = `docker ${buildX} build ${path} \
      --file ${dockerfile} \
      --build-arg IMAGE=${baseImage} \
      --tag ${tag} \
      --metadata-file ${metaFile} \
      --iidfile ${iidFile} --load`;

    if (buildX) {
      const cacheType = "gha";
      if (cacheType === "inline") {
        command += ` --cache-from type=registry,ref=${baseImage}`;
        command += ` --cache-to type=inline`;
      }
      if (cacheType === "gha") {
        command += ` --cache-from type=gha`;
        command += ` --cache-to type=gha,mode=max`;
      }
      if (cacheType === "local") {
        command += ` --cache-from type=local,src=/tmp/.buildx-cache`;
        command += ` --cache-to type=local,dest=/tmp/.buildx-cache-new`;
      }
      command += " -o image";
    }

    await exec(command, undefined, { silent });

    await exec(`ls -la .`, undefined, { silent });
    await exec(`cat ${metaFile}`, undefined, { silent });
    await exec(`docker images`, undefined, { silent });

    if (!fs.existsSync(iidFile)) {
      return undefined;
    }
    return fs.readFileSync(iidFile, {encoding: 'utf-8'}).trim();
  }

  static async run(image, parameters, silent = false) {
    const {
      unityVersion,
      workspace,
      projectPath,
      testMode,
      artifactsPath,
      useHostNetwork,
      customParameters,
      sshAgent,
      githubToken,
      gitPrivateToken,
    } = parameters;

    const command = `docker run \
        --workdir /github/workspace \
        --rm \
        --env UNITY_LICENSE \
        --env UNITY_LICENSE_FILE \
        --env UNITY_EMAIL \
        --env UNITY_PASSWORD \
        --env UNITY_SERIAL \
        --env UNITY_VERSION="${unityVersion}" \
        --env PROJECT_PATH="${projectPath}" \
        --env TEST_MODE="${testMode}" \
        --env ARTIFACTS_PATH="${artifactsPath}" \
        --env CUSTOM_PARAMETERS="${customParameters}" \
        --env GITHUB_REF \
        --env GITHUB_SHA \
        --env GITHUB_REPOSITORY \
        --env GITHUB_ACTOR \
        --env GITHUB_WORKFLOW \
        --env GITHUB_HEAD_REF \
        --env GITHUB_BASE_REF \
        --env GITHUB_EVENT_NAME \
        --env GITHUB_WORKSPACE=/github/workspace \
        --env GITHUB_ACTION \
        --env GITHUB_EVENT_PATH \
        --env RUNNER_OS \
        --env RUNNER_TOOL_CACHE \
        --env RUNNER_TEMP \
        --env RUNNER_WORKSPACE \
        --env GIT_PRIVATE_TOKEN="${gitPrivateToken}" \
        ${sshAgent ? '--env SSH_AUTH_SOCK=/ssh-agent' : ''} \
        --volume "/var/run/docker.sock":"/var/run/docker.sock" \
        --volume "/home/runner/work/_temp/_github_home":"/root" \
        --volume "/home/runner/work/_temp/_github_workflow":"/github/workflow" \
        --volume "${workspace}":"/github/workspace" \
        ${sshAgent ? `--volume ${sshAgent}:/ssh-agent` : ''} \
        ${sshAgent ? '--volume /home/runner/.ssh/known_hosts:/root/.ssh/known_hosts:ro' : ''} \
        ${useHostNetwork ? '--net=host' : ''} \
        ${githubToken ? '--env USE_EXIT_CODE=false' : '--env USE_EXIT_CODE=true'} \
        ${image}`;

    await exec(command, undefined, { silent });
  }
}

export default Docker;
