
@file:Suppress(
  "KotlinRedundantDiagnosticSuppress",
  "PropertyName",
  "MayBeConstant",
  "RedundantVisibilityModifier",
  "RedundantCompanionReference",
  "RemoveEmptyClassBody",
  "SpellCheckingInspection",
  "unused",
)

package com.google.firebase.dataconnect.generated

import com.google.firebase.dataconnect.getInstance as _fdcGetInstance
import kotlin.time.Duration.Companion.milliseconds as _milliseconds

public interface ExampleConnector : com.google.firebase.dataconnect.generated.GeneratedConnector<ExampleConnector> {
  override val dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect

  
    public val deviceOperations: DeviceOperationsMutation
  
    public val deviceRead: DeviceReadQuery
  
    public val logOperations: LogOperationsMutation
  
    public val logRead: LogReadQuery
  
    public val partnerAppsPublic: PartnerAppsPublicQuery
  
    public val subscriptionOperations: SubscriptionOperationsMutation
  
    public val subscriptionRead: SubscriptionReadQuery
  
    public val userOperations: UserOperationsMutation
  
    public val userRead: UserReadQuery
  
    public val vaultOperations: VaultOperationsMutation
  
    public val vaultRead: VaultReadQuery
  

  public companion object {
    @Suppress("MemberVisibilityCanBePrivate")
    public val config: com.google.firebase.dataconnect.ConnectorConfig = com.google.firebase.dataconnect.ConnectorConfig(
      connector = "example",
      location = "us-central1",
      serviceId = "biometric-access-system",
    )

    public fun getInstance(
      dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect
    ):ExampleConnector = synchronized(instances) {
      instances.getOrPut(dataConnect) {
        ExampleConnectorImpl(dataConnect)
      }
    }

    private val instances = java.util.WeakHashMap<com.google.firebase.dataconnect.FirebaseDataConnect, ExampleConnectorImpl>()

    
    public val defaultCacheSettings: com.google.firebase.dataconnect.CacheSettings =
      com.google.firebase.dataconnect.CacheSettings(
        
        
      )

    public val defaultDataConnectSettings: com.google.firebase.dataconnect.DataConnectSettings =
      com.google.firebase.dataconnect.DataConnectSettings(
        cacheSettings = defaultCacheSettings,
      )
    
  }
}

public val ExampleConnector.Companion.instance:ExampleConnector
  get() = getInstance(com.google.firebase.dataconnect.FirebaseDataConnect._fdcGetInstance(
    config, defaultDataConnectSettings
  ))

public fun ExampleConnector.Companion.getInstance(
  settings: com.google.firebase.dataconnect.DataConnectSettings = defaultDataConnectSettings
):ExampleConnector =
  getInstance(com.google.firebase.dataconnect.FirebaseDataConnect._fdcGetInstance(config, settings))

public fun ExampleConnector.Companion.getInstance(
  app: com.google.firebase.FirebaseApp,
  settings: com.google.firebase.dataconnect.DataConnectSettings = defaultDataConnectSettings
):ExampleConnector =
  getInstance(com.google.firebase.dataconnect.FirebaseDataConnect._fdcGetInstance(app, config, settings))

private class ExampleConnectorImpl(
  override val dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect
) : ExampleConnector {
  
    override val deviceOperations by lazy(LazyThreadSafetyMode.PUBLICATION) {
      DeviceOperationsMutationImpl(this)
    }
  
    override val deviceRead by lazy(LazyThreadSafetyMode.PUBLICATION) {
      DeviceReadQueryImpl(this)
    }
  
    override val logOperations by lazy(LazyThreadSafetyMode.PUBLICATION) {
      LogOperationsMutationImpl(this)
    }
  
    override val logRead by lazy(LazyThreadSafetyMode.PUBLICATION) {
      LogReadQueryImpl(this)
    }
  
    override val partnerAppsPublic by lazy(LazyThreadSafetyMode.PUBLICATION) {
      PartnerAppsPublicQueryImpl(this)
    }
  
    override val subscriptionOperations by lazy(LazyThreadSafetyMode.PUBLICATION) {
      SubscriptionOperationsMutationImpl(this)
    }
  
    override val subscriptionRead by lazy(LazyThreadSafetyMode.PUBLICATION) {
      SubscriptionReadQueryImpl(this)
    }
  
    override val userOperations by lazy(LazyThreadSafetyMode.PUBLICATION) {
      UserOperationsMutationImpl(this)
    }
  
    override val userRead by lazy(LazyThreadSafetyMode.PUBLICATION) {
      UserReadQueryImpl(this)
    }
  
    override val vaultOperations by lazy(LazyThreadSafetyMode.PUBLICATION) {
      VaultOperationsMutationImpl(this)
    }
  
    override val vaultRead by lazy(LazyThreadSafetyMode.PUBLICATION) {
      VaultReadQueryImpl(this)
    }
  

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun operations(): List<com.google.firebase.dataconnect.generated.GeneratedOperation<ExampleConnector, *, *>> =
    queries() + mutations()

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun mutations(): List<com.google.firebase.dataconnect.generated.GeneratedMutation<ExampleConnector, *, *>> =
    listOf(
      deviceOperations,
        logOperations,
        subscriptionOperations,
        userOperations,
        vaultOperations,
        
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun queries(): List<com.google.firebase.dataconnect.generated.GeneratedQuery<ExampleConnector, *, *>> =
    listOf(
      deviceRead,
        logRead,
        partnerAppsPublic,
        subscriptionRead,
        userRead,
        vaultRead,
        
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun copy(dataConnect: com.google.firebase.dataconnect.FirebaseDataConnect) =
    ExampleConnectorImpl(dataConnect)

  override fun equals(other: Any?): Boolean =
    other is ExampleConnectorImpl &&
    other.dataConnect == dataConnect

  override fun hashCode(): Int =
    java.util.Objects.hash(
      "ExampleConnectorImpl",
      dataConnect,
    )

  override fun toString(): String =
    "ExampleConnectorImpl(dataConnect=$dataConnect)"
}



private open class ExampleConnectorGeneratedQueryImpl<Data, Variables>(
  override val connector: ExampleConnector,
  override val operationName: String,
  override val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data>,
  override val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables>,
) : com.google.firebase.dataconnect.generated.GeneratedQuery<ExampleConnector, Data, Variables> {

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun copy(
    connector: ExampleConnector,
    operationName: String,
    dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data>,
    variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables>,
  ) =
    ExampleConnectorGeneratedQueryImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun <NewVariables> withVariablesSerializer(
    variablesSerializer: kotlinx.serialization.SerializationStrategy<NewVariables>
  ) =
    ExampleConnectorGeneratedQueryImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun <NewData> withDataDeserializer(
    dataDeserializer: kotlinx.serialization.DeserializationStrategy<NewData>
  ) =
    ExampleConnectorGeneratedQueryImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  override fun equals(other: Any?): Boolean =
    other is ExampleConnectorGeneratedQueryImpl<*,*> &&
    other.connector == connector &&
    other.operationName == operationName &&
    other.dataDeserializer == dataDeserializer &&
    other.variablesSerializer == variablesSerializer

  override fun hashCode(): Int =
    java.util.Objects.hash(
      "ExampleConnectorGeneratedQueryImpl",
      connector, operationName, dataDeserializer, variablesSerializer
    )

  override fun toString(): String =
    "ExampleConnectorGeneratedQueryImpl(" +
    "operationName=$operationName, " +
    "dataDeserializer=$dataDeserializer, " +
    "variablesSerializer=$variablesSerializer, " +
    "connector=$connector)"
}

private open class ExampleConnectorGeneratedMutationImpl<Data, Variables>(
  override val connector: ExampleConnector,
  override val operationName: String,
  override val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data>,
  override val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables>,
) : com.google.firebase.dataconnect.generated.GeneratedMutation<ExampleConnector, Data, Variables> {

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun copy(
    connector: ExampleConnector,
    operationName: String,
    dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data>,
    variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables>,
  ) =
    ExampleConnectorGeneratedMutationImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun <NewVariables> withVariablesSerializer(
    variablesSerializer: kotlinx.serialization.SerializationStrategy<NewVariables>
  ) =
    ExampleConnectorGeneratedMutationImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  @com.google.firebase.dataconnect.ExperimentalFirebaseDataConnect
  override fun <NewData> withDataDeserializer(
    dataDeserializer: kotlinx.serialization.DeserializationStrategy<NewData>
  ) =
    ExampleConnectorGeneratedMutationImpl(
      connector, operationName, dataDeserializer, variablesSerializer
    )

  override fun equals(other: Any?): Boolean =
    other is ExampleConnectorGeneratedMutationImpl<*,*> &&
    other.connector == connector &&
    other.operationName == operationName &&
    other.dataDeserializer == dataDeserializer &&
    other.variablesSerializer == variablesSerializer

  override fun hashCode(): Int =
    java.util.Objects.hash(
      "ExampleConnectorGeneratedMutationImpl",
      connector, operationName, dataDeserializer, variablesSerializer
    )

  override fun toString(): String =
    "ExampleConnectorGeneratedMutationImpl(" +
    "operationName=$operationName, " +
    "dataDeserializer=$dataDeserializer, " +
    "variablesSerializer=$variablesSerializer, " +
    "connector=$connector)"
}



private class DeviceOperationsMutationImpl(
  connector: ExampleConnector
):
  DeviceOperationsMutation,
  ExampleConnectorGeneratedMutationImpl<
      DeviceOperationsMutation.Data,
      DeviceOperationsMutation.Variables
  >(
    connector,
    DeviceOperationsMutation.Companion.operationName,
    DeviceOperationsMutation.Companion.dataDeserializer,
    DeviceOperationsMutation.Companion.variablesSerializer,
  )


private class DeviceReadQueryImpl(
  connector: ExampleConnector
):
  DeviceReadQuery,
  ExampleConnectorGeneratedQueryImpl<
      DeviceReadQuery.Data,
      Unit
  >(
    connector,
    DeviceReadQuery.Companion.operationName,
    DeviceReadQuery.Companion.dataDeserializer,
    DeviceReadQuery.Companion.variablesSerializer,
  )


private class LogOperationsMutationImpl(
  connector: ExampleConnector
):
  LogOperationsMutation,
  ExampleConnectorGeneratedMutationImpl<
      LogOperationsMutation.Data,
      LogOperationsMutation.Variables
  >(
    connector,
    LogOperationsMutation.Companion.operationName,
    LogOperationsMutation.Companion.dataDeserializer,
    LogOperationsMutation.Companion.variablesSerializer,
  )


private class LogReadQueryImpl(
  connector: ExampleConnector
):
  LogReadQuery,
  ExampleConnectorGeneratedQueryImpl<
      LogReadQuery.Data,
      Unit
  >(
    connector,
    LogReadQuery.Companion.operationName,
    LogReadQuery.Companion.dataDeserializer,
    LogReadQuery.Companion.variablesSerializer,
  )


private class PartnerAppsPublicQueryImpl(
  connector: ExampleConnector
):
  PartnerAppsPublicQuery,
  ExampleConnectorGeneratedQueryImpl<
      PartnerAppsPublicQuery.Data,
      Unit
  >(
    connector,
    PartnerAppsPublicQuery.Companion.operationName,
    PartnerAppsPublicQuery.Companion.dataDeserializer,
    PartnerAppsPublicQuery.Companion.variablesSerializer,
  )


private class SubscriptionOperationsMutationImpl(
  connector: ExampleConnector
):
  SubscriptionOperationsMutation,
  ExampleConnectorGeneratedMutationImpl<
      SubscriptionOperationsMutation.Data,
      SubscriptionOperationsMutation.Variables
  >(
    connector,
    SubscriptionOperationsMutation.Companion.operationName,
    SubscriptionOperationsMutation.Companion.dataDeserializer,
    SubscriptionOperationsMutation.Companion.variablesSerializer,
  )


private class SubscriptionReadQueryImpl(
  connector: ExampleConnector
):
  SubscriptionReadQuery,
  ExampleConnectorGeneratedQueryImpl<
      SubscriptionReadQuery.Data,
      Unit
  >(
    connector,
    SubscriptionReadQuery.Companion.operationName,
    SubscriptionReadQuery.Companion.dataDeserializer,
    SubscriptionReadQuery.Companion.variablesSerializer,
  )


private class UserOperationsMutationImpl(
  connector: ExampleConnector
):
  UserOperationsMutation,
  ExampleConnectorGeneratedMutationImpl<
      UserOperationsMutation.Data,
      UserOperationsMutation.Variables
  >(
    connector,
    UserOperationsMutation.Companion.operationName,
    UserOperationsMutation.Companion.dataDeserializer,
    UserOperationsMutation.Companion.variablesSerializer,
  )


private class UserReadQueryImpl(
  connector: ExampleConnector
):
  UserReadQuery,
  ExampleConnectorGeneratedQueryImpl<
      UserReadQuery.Data,
      Unit
  >(
    connector,
    UserReadQuery.Companion.operationName,
    UserReadQuery.Companion.dataDeserializer,
    UserReadQuery.Companion.variablesSerializer,
  )


private class VaultOperationsMutationImpl(
  connector: ExampleConnector
):
  VaultOperationsMutation,
  ExampleConnectorGeneratedMutationImpl<
      VaultOperationsMutation.Data,
      VaultOperationsMutation.Variables
  >(
    connector,
    VaultOperationsMutation.Companion.operationName,
    VaultOperationsMutation.Companion.dataDeserializer,
    VaultOperationsMutation.Companion.variablesSerializer,
  )


private class VaultReadQueryImpl(
  connector: ExampleConnector
):
  VaultReadQuery,
  ExampleConnectorGeneratedQueryImpl<
      VaultReadQuery.Data,
      Unit
  >(
    connector,
    VaultReadQuery.Companion.operationName,
    VaultReadQuery.Companion.dataDeserializer,
    VaultReadQuery.Companion.variablesSerializer,
  )


