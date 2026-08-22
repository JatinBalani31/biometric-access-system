import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise, DataConnectSettings } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;
export const dataConnectSettings: DataConnectSettings;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AuthLog_Key {
  id: UUIDString;
  __typename?: 'AuthLog_Key';
}

export interface DeviceOperationsData {
  device_insert: Device_Key;
  device_update?: Device_Key | null;
  device_delete?: Device_Key | null;
}

export interface DeviceOperationsVariables {
  deviceName: string;
  publicKey: string;
}

export interface DeviceReadData {
  device?: {
    deviceName: string;
  };
  devices: ({
    deviceName: string;
  })[];
}

export interface Device_Key {
  id: UUIDString;
  __typename?: 'Device_Key';
}

export interface LogOperationsData {
  authLog_insert: AuthLog_Key;
  authLog_update?: AuthLog_Key | null;
  authLog_delete?: AuthLog_Key | null;
}

export interface LogOperationsVariables {
  status: string;
  ipAddress: string;
  appId: UUIDString;
  deviceId: UUIDString;
}

export interface LogReadData {
  authLog?: {
    status: string;
  };
  authLogs: ({
    timestamp: TimestampString;
    status: string;
  })[];
}

export interface PartnerApp_Key {
  id: UUIDString;
  __typename?: 'PartnerApp_Key';
}

export interface PartnerAppsPublicData {
  partnerApps: ({
    appName: string;
    organizationName?: string | null;
  })[];
}

export interface SubscriptionOperationsData {
  userSubscription_insert: UserSubscription_Key;
  userSubscription_update?: UserSubscription_Key | null;
  userSubscription_delete?: UserSubscription_Key | null;
}

export interface SubscriptionOperationsVariables {
  planType: string;
  startDate: DateString;
  expiryDate: DateString;
  status: string;
}

export interface SubscriptionReadData {
  userSubscription?: {
    planType: string;
    status: string;
  };
  userSubscriptions: ({
    planType: string;
  })[];
}

export interface UserOperationsData {
  user_insert: User_Key;
  user_update?: User_Key | null;
  user_delete?: User_Key | null;
}

export interface UserOperationsVariables {
  email: string;
  subscriptionStatus: string;
}

export interface UserReadData {
  user?: {
    email: string;
    subscriptionStatus: string;
  };
  users: ({
    email: string;
  })[];
}

export interface UserSubscription_Key {
  id: UUIDString;
  __typename?: 'UserSubscription_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface VaultItem_Key {
  id: UUIDString;
  __typename?: 'VaultItem_Key';
}

export interface VaultOperationsData {
  vaultItem_insert: VaultItem_Key;
  vaultItem_update?: VaultItem_Key | null;
  vaultItem_delete?: VaultItem_Key | null;
}

export interface VaultOperationsVariables {
  title: string;
  encryptedContent: string;
}

export interface VaultReadData {
  vaultItem?: {
    title: string;
  };
  vaultItems: ({
    title: string;
  })[];
}

interface UserOperationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: UserOperationsVariables): MutationRef<UserOperationsData, UserOperationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: UserOperationsVariables): MutationRef<UserOperationsData, UserOperationsVariables>;
  operationName: string;
}
export const userOperationsRef: UserOperationsRef;

export function userOperations(vars: UserOperationsVariables): MutationPromise<UserOperationsData, UserOperationsVariables>;
export function userOperations(dc: DataConnect, vars: UserOperationsVariables): MutationPromise<UserOperationsData, UserOperationsVariables>;

interface UserReadRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<UserReadData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<UserReadData, undefined>;
  operationName: string;
}
export const userReadRef: UserReadRef;

export function userRead(options?: ExecuteQueryOptions): QueryPromise<UserReadData, undefined>;
export function userRead(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<UserReadData, undefined>;

interface SubscriptionOperationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: SubscriptionOperationsVariables): MutationRef<SubscriptionOperationsData, SubscriptionOperationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: SubscriptionOperationsVariables): MutationRef<SubscriptionOperationsData, SubscriptionOperationsVariables>;
  operationName: string;
}
export const subscriptionOperationsRef: SubscriptionOperationsRef;

export function subscriptionOperations(vars: SubscriptionOperationsVariables): MutationPromise<SubscriptionOperationsData, SubscriptionOperationsVariables>;
export function subscriptionOperations(dc: DataConnect, vars: SubscriptionOperationsVariables): MutationPromise<SubscriptionOperationsData, SubscriptionOperationsVariables>;

interface SubscriptionReadRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<SubscriptionReadData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<SubscriptionReadData, undefined>;
  operationName: string;
}
export const subscriptionReadRef: SubscriptionReadRef;

export function subscriptionRead(options?: ExecuteQueryOptions): QueryPromise<SubscriptionReadData, undefined>;
export function subscriptionRead(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<SubscriptionReadData, undefined>;

interface DeviceOperationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: DeviceOperationsVariables): MutationRef<DeviceOperationsData, DeviceOperationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: DeviceOperationsVariables): MutationRef<DeviceOperationsData, DeviceOperationsVariables>;
  operationName: string;
}
export const deviceOperationsRef: DeviceOperationsRef;

export function deviceOperations(vars: DeviceOperationsVariables): MutationPromise<DeviceOperationsData, DeviceOperationsVariables>;
export function deviceOperations(dc: DataConnect, vars: DeviceOperationsVariables): MutationPromise<DeviceOperationsData, DeviceOperationsVariables>;

interface DeviceReadRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<DeviceReadData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<DeviceReadData, undefined>;
  operationName: string;
}
export const deviceReadRef: DeviceReadRef;

export function deviceRead(options?: ExecuteQueryOptions): QueryPromise<DeviceReadData, undefined>;
export function deviceRead(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<DeviceReadData, undefined>;

interface VaultOperationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: VaultOperationsVariables): MutationRef<VaultOperationsData, VaultOperationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: VaultOperationsVariables): MutationRef<VaultOperationsData, VaultOperationsVariables>;
  operationName: string;
}
export const vaultOperationsRef: VaultOperationsRef;

export function vaultOperations(vars: VaultOperationsVariables): MutationPromise<VaultOperationsData, VaultOperationsVariables>;
export function vaultOperations(dc: DataConnect, vars: VaultOperationsVariables): MutationPromise<VaultOperationsData, VaultOperationsVariables>;

interface VaultReadRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<VaultReadData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<VaultReadData, undefined>;
  operationName: string;
}
export const vaultReadRef: VaultReadRef;

export function vaultRead(options?: ExecuteQueryOptions): QueryPromise<VaultReadData, undefined>;
export function vaultRead(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<VaultReadData, undefined>;

interface LogOperationsRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: LogOperationsVariables): MutationRef<LogOperationsData, LogOperationsVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: LogOperationsVariables): MutationRef<LogOperationsData, LogOperationsVariables>;
  operationName: string;
}
export const logOperationsRef: LogOperationsRef;

export function logOperations(vars: LogOperationsVariables): MutationPromise<LogOperationsData, LogOperationsVariables>;
export function logOperations(dc: DataConnect, vars: LogOperationsVariables): MutationPromise<LogOperationsData, LogOperationsVariables>;

interface LogReadRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<LogReadData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<LogReadData, undefined>;
  operationName: string;
}
export const logReadRef: LogReadRef;

export function logRead(options?: ExecuteQueryOptions): QueryPromise<LogReadData, undefined>;
export function logRead(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<LogReadData, undefined>;

interface PartnerAppsPublicRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<PartnerAppsPublicData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<PartnerAppsPublicData, undefined>;
  operationName: string;
}
export const partnerAppsPublicRef: PartnerAppsPublicRef;

export function partnerAppsPublic(options?: ExecuteQueryOptions): QueryPromise<PartnerAppsPublicData, undefined>;
export function partnerAppsPublic(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<PartnerAppsPublicData, undefined>;

