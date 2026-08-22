import { UserOperationsData, UserOperationsVariables, UserReadData, SubscriptionOperationsData, SubscriptionOperationsVariables, SubscriptionReadData, DeviceOperationsData, DeviceOperationsVariables, DeviceReadData, VaultOperationsData, VaultOperationsVariables, VaultReadData, LogOperationsData, LogOperationsVariables, LogReadData, PartnerAppsPublicData } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useUserOperations(options?: useDataConnectMutationOptions<UserOperationsData, FirebaseError, UserOperationsVariables>): UseDataConnectMutationResult<UserOperationsData, UserOperationsVariables>;
export function useUserOperations(dc: DataConnect, options?: useDataConnectMutationOptions<UserOperationsData, FirebaseError, UserOperationsVariables>): UseDataConnectMutationResult<UserOperationsData, UserOperationsVariables>;

export function useUserRead(options?: useDataConnectQueryOptions<UserReadData>): UseDataConnectQueryResult<UserReadData, undefined>;
export function useUserRead(dc: DataConnect, options?: useDataConnectQueryOptions<UserReadData>): UseDataConnectQueryResult<UserReadData, undefined>;

export function useSubscriptionOperations(options?: useDataConnectMutationOptions<SubscriptionOperationsData, FirebaseError, SubscriptionOperationsVariables>): UseDataConnectMutationResult<SubscriptionOperationsData, SubscriptionOperationsVariables>;
export function useSubscriptionOperations(dc: DataConnect, options?: useDataConnectMutationOptions<SubscriptionOperationsData, FirebaseError, SubscriptionOperationsVariables>): UseDataConnectMutationResult<SubscriptionOperationsData, SubscriptionOperationsVariables>;

export function useSubscriptionRead(options?: useDataConnectQueryOptions<SubscriptionReadData>): UseDataConnectQueryResult<SubscriptionReadData, undefined>;
export function useSubscriptionRead(dc: DataConnect, options?: useDataConnectQueryOptions<SubscriptionReadData>): UseDataConnectQueryResult<SubscriptionReadData, undefined>;

export function useDeviceOperations(options?: useDataConnectMutationOptions<DeviceOperationsData, FirebaseError, DeviceOperationsVariables>): UseDataConnectMutationResult<DeviceOperationsData, DeviceOperationsVariables>;
export function useDeviceOperations(dc: DataConnect, options?: useDataConnectMutationOptions<DeviceOperationsData, FirebaseError, DeviceOperationsVariables>): UseDataConnectMutationResult<DeviceOperationsData, DeviceOperationsVariables>;

export function useDeviceRead(options?: useDataConnectQueryOptions<DeviceReadData>): UseDataConnectQueryResult<DeviceReadData, undefined>;
export function useDeviceRead(dc: DataConnect, options?: useDataConnectQueryOptions<DeviceReadData>): UseDataConnectQueryResult<DeviceReadData, undefined>;

export function useVaultOperations(options?: useDataConnectMutationOptions<VaultOperationsData, FirebaseError, VaultOperationsVariables>): UseDataConnectMutationResult<VaultOperationsData, VaultOperationsVariables>;
export function useVaultOperations(dc: DataConnect, options?: useDataConnectMutationOptions<VaultOperationsData, FirebaseError, VaultOperationsVariables>): UseDataConnectMutationResult<VaultOperationsData, VaultOperationsVariables>;

export function useVaultRead(options?: useDataConnectQueryOptions<VaultReadData>): UseDataConnectQueryResult<VaultReadData, undefined>;
export function useVaultRead(dc: DataConnect, options?: useDataConnectQueryOptions<VaultReadData>): UseDataConnectQueryResult<VaultReadData, undefined>;

export function useLogOperations(options?: useDataConnectMutationOptions<LogOperationsData, FirebaseError, LogOperationsVariables>): UseDataConnectMutationResult<LogOperationsData, LogOperationsVariables>;
export function useLogOperations(dc: DataConnect, options?: useDataConnectMutationOptions<LogOperationsData, FirebaseError, LogOperationsVariables>): UseDataConnectMutationResult<LogOperationsData, LogOperationsVariables>;

export function useLogRead(options?: useDataConnectQueryOptions<LogReadData>): UseDataConnectQueryResult<LogReadData, undefined>;
export function useLogRead(dc: DataConnect, options?: useDataConnectQueryOptions<LogReadData>): UseDataConnectQueryResult<LogReadData, undefined>;

export function usePartnerAppsPublic(options?: useDataConnectQueryOptions<PartnerAppsPublicData>): UseDataConnectQueryResult<PartnerAppsPublicData, undefined>;
export function usePartnerAppsPublic(dc: DataConnect, options?: useDataConnectQueryOptions<PartnerAppsPublicData>): UseDataConnectQueryResult<PartnerAppsPublicData, undefined>;
