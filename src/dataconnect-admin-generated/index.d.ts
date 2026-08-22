import { ConnectorConfig, DataConnect, OperationOptions, ExecuteOperationResponse } from 'firebase-admin/data-connect';

export const connectorConfig: ConnectorConfig;

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

/** Generated Node Admin SDK operation action function for the 'UserOperations' Mutation. Allow users to execute without passing in DataConnect. */
export function userOperations(dc: DataConnect, vars: UserOperationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UserOperationsData>>;
/** Generated Node Admin SDK operation action function for the 'UserOperations' Mutation. Allow users to pass in custom DataConnect instances. */
export function userOperations(vars: UserOperationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<UserOperationsData>>;

/** Generated Node Admin SDK operation action function for the 'UserRead' Query. Allow users to execute without passing in DataConnect. */
export function userRead(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<UserReadData>>;
/** Generated Node Admin SDK operation action function for the 'UserRead' Query. Allow users to pass in custom DataConnect instances. */
export function userRead(options?: OperationOptions): Promise<ExecuteOperationResponse<UserReadData>>;

/** Generated Node Admin SDK operation action function for the 'SubscriptionOperations' Mutation. Allow users to execute without passing in DataConnect. */
export function subscriptionOperations(dc: DataConnect, vars: SubscriptionOperationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SubscriptionOperationsData>>;
/** Generated Node Admin SDK operation action function for the 'SubscriptionOperations' Mutation. Allow users to pass in custom DataConnect instances. */
export function subscriptionOperations(vars: SubscriptionOperationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<SubscriptionOperationsData>>;

/** Generated Node Admin SDK operation action function for the 'SubscriptionRead' Query. Allow users to execute without passing in DataConnect. */
export function subscriptionRead(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<SubscriptionReadData>>;
/** Generated Node Admin SDK operation action function for the 'SubscriptionRead' Query. Allow users to pass in custom DataConnect instances. */
export function subscriptionRead(options?: OperationOptions): Promise<ExecuteOperationResponse<SubscriptionReadData>>;

/** Generated Node Admin SDK operation action function for the 'DeviceOperations' Mutation. Allow users to execute without passing in DataConnect. */
export function deviceOperations(dc: DataConnect, vars: DeviceOperationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeviceOperationsData>>;
/** Generated Node Admin SDK operation action function for the 'DeviceOperations' Mutation. Allow users to pass in custom DataConnect instances. */
export function deviceOperations(vars: DeviceOperationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<DeviceOperationsData>>;

/** Generated Node Admin SDK operation action function for the 'DeviceRead' Query. Allow users to execute without passing in DataConnect. */
export function deviceRead(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<DeviceReadData>>;
/** Generated Node Admin SDK operation action function for the 'DeviceRead' Query. Allow users to pass in custom DataConnect instances. */
export function deviceRead(options?: OperationOptions): Promise<ExecuteOperationResponse<DeviceReadData>>;

/** Generated Node Admin SDK operation action function for the 'VaultOperations' Mutation. Allow users to execute without passing in DataConnect. */
export function vaultOperations(dc: DataConnect, vars: VaultOperationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<VaultOperationsData>>;
/** Generated Node Admin SDK operation action function for the 'VaultOperations' Mutation. Allow users to pass in custom DataConnect instances. */
export function vaultOperations(vars: VaultOperationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<VaultOperationsData>>;

/** Generated Node Admin SDK operation action function for the 'VaultRead' Query. Allow users to execute without passing in DataConnect. */
export function vaultRead(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<VaultReadData>>;
/** Generated Node Admin SDK operation action function for the 'VaultRead' Query. Allow users to pass in custom DataConnect instances. */
export function vaultRead(options?: OperationOptions): Promise<ExecuteOperationResponse<VaultReadData>>;

/** Generated Node Admin SDK operation action function for the 'LogOperations' Mutation. Allow users to execute without passing in DataConnect. */
export function logOperations(dc: DataConnect, vars: LogOperationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<LogOperationsData>>;
/** Generated Node Admin SDK operation action function for the 'LogOperations' Mutation. Allow users to pass in custom DataConnect instances. */
export function logOperations(vars: LogOperationsVariables, options?: OperationOptions): Promise<ExecuteOperationResponse<LogOperationsData>>;

/** Generated Node Admin SDK operation action function for the 'LogRead' Query. Allow users to execute without passing in DataConnect. */
export function logRead(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<LogReadData>>;
/** Generated Node Admin SDK operation action function for the 'LogRead' Query. Allow users to pass in custom DataConnect instances. */
export function logRead(options?: OperationOptions): Promise<ExecuteOperationResponse<LogReadData>>;

/** Generated Node Admin SDK operation action function for the 'PartnerAppsPublic' Query. Allow users to execute without passing in DataConnect. */
export function partnerAppsPublic(dc: DataConnect, options?: OperationOptions): Promise<ExecuteOperationResponse<PartnerAppsPublicData>>;
/** Generated Node Admin SDK operation action function for the 'PartnerAppsPublic' Query. Allow users to pass in custom DataConnect instances. */
export function partnerAppsPublic(options?: OperationOptions): Promise<ExecuteOperationResponse<PartnerAppsPublicData>>;

