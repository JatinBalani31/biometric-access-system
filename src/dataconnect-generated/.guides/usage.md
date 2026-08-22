# Basic Usage

Always prioritize using a supported framework over using the generated SDK
directly. Supported frameworks simplify the developer experience and help ensure
best practices are followed.




### React
For each operation, there is a wrapper hook that can be used to call the operation.

Here are all of the hooks that get generated:
```ts
import { useUserOperations, useUserRead, useSubscriptionOperations, useSubscriptionRead, useDeviceOperations, useDeviceRead, useVaultOperations, useVaultRead, useLogOperations, useLogRead } from '@dataconnect/generated/react';
// The types of these hooks are available in react/index.d.ts

const { data, isPending, isSuccess, isError, error } = useUserOperations(userOperationsVars);

const { data, isPending, isSuccess, isError, error } = useUserRead();

const { data, isPending, isSuccess, isError, error } = useSubscriptionOperations(subscriptionOperationsVars);

const { data, isPending, isSuccess, isError, error } = useSubscriptionRead();

const { data, isPending, isSuccess, isError, error } = useDeviceOperations(deviceOperationsVars);

const { data, isPending, isSuccess, isError, error } = useDeviceRead();

const { data, isPending, isSuccess, isError, error } = useVaultOperations(vaultOperationsVars);

const { data, isPending, isSuccess, isError, error } = useVaultRead();

const { data, isPending, isSuccess, isError, error } = useLogOperations(logOperationsVars);

const { data, isPending, isSuccess, isError, error } = useLogRead();

```

Here's an example from a different generated SDK:

```ts
import { useListAllMovies } from '@dataconnect/generated/react';

function MyComponent() {
  const { isLoading, data, error } = useListAllMovies();
  if(isLoading) {
    return <div>Loading...</div>
  }
  if(error) {
    return <div> An Error Occurred: {error} </div>
  }
}

// App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MyComponent from './my-component';

function App() {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>
    <MyComponent />
  </QueryClientProvider>
}
```



## Advanced Usage
If a user is not using a supported framework, they can use the generated SDK directly.

Here's an example of how to use it with the first 5 operations:

```js
import { userOperations, userRead, subscriptionOperations, subscriptionRead, deviceOperations, deviceRead, vaultOperations, vaultRead, logOperations, logRead } from '@dataconnect/generated';


// Operation UserOperations:  For variables, look at type UserOperationsVars in ../index.d.ts
const { data } = await UserOperations(dataConnect, userOperationsVars);

// Operation UserRead: 
const { data } = await UserRead(dataConnect);

// Operation SubscriptionOperations:  For variables, look at type SubscriptionOperationsVars in ../index.d.ts
const { data } = await SubscriptionOperations(dataConnect, subscriptionOperationsVars);

// Operation SubscriptionRead: 
const { data } = await SubscriptionRead(dataConnect);

// Operation DeviceOperations:  For variables, look at type DeviceOperationsVars in ../index.d.ts
const { data } = await DeviceOperations(dataConnect, deviceOperationsVars);

// Operation DeviceRead: 
const { data } = await DeviceRead(dataConnect);

// Operation VaultOperations:  For variables, look at type VaultOperationsVars in ../index.d.ts
const { data } = await VaultOperations(dataConnect, vaultOperationsVars);

// Operation VaultRead: 
const { data } = await VaultRead(dataConnect);

// Operation LogOperations:  For variables, look at type LogOperationsVars in ../index.d.ts
const { data } = await LogOperations(dataConnect, logOperationsVars);

// Operation LogRead: 
const { data } = await LogRead(dataConnect);


```