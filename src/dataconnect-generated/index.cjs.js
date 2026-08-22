const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs, makeMemoryCacheProvider } = require('firebase/data-connect');

const connectorConfig = {
  connector: 'example',
  service: 'biometric-access-system',
  location: 'us-central1'
};
exports.connectorConfig = connectorConfig;
const dataConnectSettings = {
  cacheSettings: {
    cacheProvider: makeMemoryCacheProvider()
  }
};
exports.dataConnectSettings = dataConnectSettings;

const userOperationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'UserOperations', inputVars);
}
userOperationsRef.operationName = 'UserOperations';
exports.userOperationsRef = userOperationsRef;

exports.userOperations = function userOperations(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(userOperationsRef(dcInstance, inputVars));
}
;

const userReadRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'UserRead');
}
userReadRef.operationName = 'UserRead';
exports.userReadRef = userReadRef;

exports.userRead = function userRead(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(userReadRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const subscriptionOperationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SubscriptionOperations', inputVars);
}
subscriptionOperationsRef.operationName = 'SubscriptionOperations';
exports.subscriptionOperationsRef = subscriptionOperationsRef;

exports.subscriptionOperations = function subscriptionOperations(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(subscriptionOperationsRef(dcInstance, inputVars));
}
;

const subscriptionReadRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'SubscriptionRead');
}
subscriptionReadRef.operationName = 'SubscriptionRead';
exports.subscriptionReadRef = subscriptionReadRef;

exports.subscriptionRead = function subscriptionRead(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(subscriptionReadRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const deviceOperationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'DeviceOperations', inputVars);
}
deviceOperationsRef.operationName = 'DeviceOperations';
exports.deviceOperationsRef = deviceOperationsRef;

exports.deviceOperations = function deviceOperations(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(deviceOperationsRef(dcInstance, inputVars));
}
;

const deviceReadRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'DeviceRead');
}
deviceReadRef.operationName = 'DeviceRead';
exports.deviceReadRef = deviceReadRef;

exports.deviceRead = function deviceRead(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(deviceReadRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const vaultOperationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'VaultOperations', inputVars);
}
vaultOperationsRef.operationName = 'VaultOperations';
exports.vaultOperationsRef = vaultOperationsRef;

exports.vaultOperations = function vaultOperations(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(vaultOperationsRef(dcInstance, inputVars));
}
;

const vaultReadRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'VaultRead');
}
vaultReadRef.operationName = 'VaultRead';
exports.vaultReadRef = vaultReadRef;

exports.vaultRead = function vaultRead(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(vaultReadRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const logOperationsRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'LogOperations', inputVars);
}
logOperationsRef.operationName = 'LogOperations';
exports.logOperationsRef = logOperationsRef;

exports.logOperations = function logOperations(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(logOperationsRef(dcInstance, inputVars));
}
;

const logReadRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'LogRead');
}
logReadRef.operationName = 'LogRead';
exports.logReadRef = logReadRef;

exports.logRead = function logRead(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(logReadRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const partnerAppsPublicRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'PartnerAppsPublic');
}
partnerAppsPublicRef.operationName = 'PartnerAppsPublic';
exports.partnerAppsPublicRef = partnerAppsPublicRef;

exports.partnerAppsPublic = function partnerAppsPublic(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(partnerAppsPublicRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;
