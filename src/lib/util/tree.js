/* eslint-disable no-param-reassign, no-else-return */
const _ = require('lodash');

let nodeString = '';

const findGitFileStatus = (file, filePath) => {
  if (file.path === filePath || (file.path.includes('->') && file.path.endsWith(filePath))) {
    if (file.working_dir !== ' ') {
      if (file.index === 'R') {
        return file.index;
      }
      return file.working_dir;
    } else if (file.index !== ' ') {
      return file.index;
    }
  }
  return '';
};

// eslint-disable-next-line consistent-return
const decideNodeIcon = (file, filePath) => {
  const fileStatus = findGitFileStatus(file, filePath);
  if (fileStatus === 'M') {
    return './resources/icons/Modified.svg';
  } else if (fileStatus === 'A') {
    return './resources/icons/added.svg';
  } else if (fileStatus === '?') {
    return './resources/icons/Untracked.svg';
  } else if (fileStatus === 'D') {
    return './resources/icons/Deleted.svg';
  } else if (fileStatus === 'U') {
    return './resources/icons/Conflict.svg';
  } else if (fileStatus === 'R') {
    return './resources/icons/Renamed.svg';
  }
};

const compareTreeNodes = (a, b) => {
  let comparison = 0;
  if (a.value > b.value) {
    comparison = 1;
  } else if (a.value < b.value) {
    comparison = -1;
  }
  return comparison;
};

const sortTree = (siblingNodes) => {
  let tempSiblingNodes = _.cloneDeep(siblingNodes);
  const folders = [];
  const files = [];
  tempSiblingNodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      folders.push(node);
      node.children = sortTree(node.children);
    } else {
      files.push(node);
    }
  });
  folders.sort(compareTreeNodes);
  files.sort(compareTreeNodes);
  tempSiblingNodes = folders.concat(files);
  return tempSiblingNodes;
};

const isEveryChildChecked = node => node.children.every(child => child.checked === true);

const isSomeChildChecked = node => node.children.some(
  child => child.checked === true || child.className === 'adx-partially-selected-tree-node',
);

const determineShallowCheckState = (node) => {
  if (isEveryChildChecked(node)) {
    return true;
  }

  if (isSomeChildChecked(node)) {
    return 'adx-partially-selected-tree-node';
  }

  return false;
};

const setCheckState = (treeNodes) => {
  const nodes = treeNodes.map((node) => {
    if (node.children && node.children.length) {
      node.children = setCheckState(node.children);
      const checkState = determineShallowCheckState(node);
      if (typeof checkState === 'boolean') {
        node.checked = checkState;
      } else {
        node.checked = false;
        node.className = checkState;
      }
    }
    return node;
  });
  return nodes;
};

const createNodes = (treeNodes, filesWithConflict) => {
  treeNodes.map((node) => {
    nodeString += `
    <li role="treeitem" aria-expanded="${node.expanded}" aria-label="${node.label}" aria-level="${node.level}">
      <div class="slds-tree__item">
        <div class="slds-checkbox">
          <input type="checkbox" name="default" id="${node.value}" class="treecheckbox ${node.className}" value="${node.value}" ${node.checked ? 'checked' : ''} ${filesWithConflict.includes(node.value) ? 'disabled' : ''}/>
          <label class="slds-checkbox__label" for="${node.value}">
              <span class="slds-checkbox_faux"></span>
          </label>
        </div>
  `;
    if (node.children && node.children.length) {
      nodeString += `
          <button
            class="slds-button slds-button_icon slds-m-right_xx-small expandButton" aria-hidden="true" tabindex="-1"
            title="${node.label}"
            value="${node.value}"
          >
            <svg class="slds-button__icon slds-button__icon_small cta-blue" aria-hidden="true">
              <use xlink:href="./resources/assets/icons/utility-sprite/svg/symbols.svg#chevronright">
              </use>
            </svg>
            <span class="slds-assistive-text">Expand ${node.label}</span>
          </button>
          <label class="slds-has-flexi-truncate">
            <span class="slds-tree__item-label slds-truncate flexed ${filesWithConflict.includes(node.value) ? 'error' : ''}" title="${node.label}">
              <img src="./resources/icons/Folder.svg" class="slds-m-right_x-small gitStageIcon" />
                ${node.label}
            </span>
          </label>
        </div>
        <ul role="group">
      `;
      createNodes(node.children, filesWithConflict);
      nodeString += '</ul>';
    } else {
      nodeString += `
          <label class="slds-has-flexi-truncate">
            <span class="slds-tree__item-label slds-truncate flexed ${filesWithConflict.includes(node.value) ? 'error' : ''}" title="${node.label}">
              <img src="${node.icon}" class="slds-m-right_x-small gitStageIcon" />
                ${node.label}
            </span>
          </label>
        </div>
      `;
    }
    nodeString += '</li>';
  });
};

const createTreeNodes = (gitStatus, nodeExpandStatus) => {
  const directoryTree = [];
  const changedFiles = gitStatus.files;
  const filesWithConflict = gitStatus.conflicted;
  const stagedFiles = [];
  const partialStagedFiles = [];

  changedFiles.forEach((file) => {
    const regexForDuplicateQuotes = /"/g;
    /* eslint-disable no-param-reassign */
    file.path = file.path.replace(regexForDuplicateQuotes, '');
    let splitDoublePaths = file.path.split('->');
    if (splitDoublePaths.length > 0) {
      splitDoublePaths = splitDoublePaths[splitDoublePaths.length - 1];
    } else {
      splitDoublePaths = file.path;
    }
    const splitFilePath = splitDoublePaths.split('/');
    let tempChildrenArray = directoryTree;
    let filePath = '';
    let currentLevel = 1;

    splitFilePath.forEach((fileName) => {
      fileName = fileName.trim();

      if (filePath === '') {
        filePath = fileName;
      } else {
        filePath += `/${fileName}`;
      }

      let matchedFileObj = _.find(
        tempChildrenArray,
        tempValue => tempValue.value === filePath,
      );
      if (
        (file.index === 'R'
          && file.path.endsWith(filePath)
          && file.working_dir !== ' ')
        || (file.path === filePath
          && file.index !== ' '
          && file.index !== '?'
          && file.working_dir !== ' ')
      ) {
        partialStagedFiles.push(filePath);
      }

      const nodeIcon = decideNodeIcon(file, filePath);

      if (file.index !== ' '
        && file.index !== '?'
        && file.working_dir === ' ') {
        stagedFiles.push(filePath);
      }

      if (!matchedFileObj) {
        // create new node object if it does not exist at current level
        matchedFileObj = {
          value: filePath,
          label: fileName,
          level: currentLevel,
          children: [],
          expanded: nodeExpandStatus[filePath] ? nodeExpandStatus[filePath].expanded : true,
          checked: stagedFiles.includes(filePath),
          className: partialStagedFiles.includes(filePath)
            ? 'adx-partially-selected-tree-node'
            : '',
        };
        if (nodeIcon) {
          matchedFileObj.icon = nodeIcon;
        }
        tempChildrenArray.push(matchedFileObj);
      }

      // change level of directory hierarchy to children of current node
      tempChildrenArray = matchedFileObj.children;
      currentLevel += 1;
    });
  });
  // set/update checked state for all nodes
  setCheckState(directoryTree);
  const sortedDirectoryTree = sortTree(directoryTree);
  nodeString = `
    <ul aria-labelledby="treeheading" class="slds-tree" role="tree">
  `;
  createNodes(sortedDirectoryTree, filesWithConflict);
  nodeString += '</ul>';
  return { nodeString, filesWithConflict, partialStagedFiles };
};

module.exports = { createTreeNodes };
