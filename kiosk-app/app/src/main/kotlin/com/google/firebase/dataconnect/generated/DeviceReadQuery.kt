
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


import kotlinx.coroutines.flow.filterNotNull as _flow_filterNotNull
import kotlinx.coroutines.flow.map as _flow_map


public interface DeviceReadQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
      ExampleConnector,
      DeviceReadQuery.Data,
      Unit
    >
{
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val device: Device?,
  
    val devices: List<DevicesItem>,
  
  ) {
    
      
        @kotlinx.serialization.Serializable
  public data class Device(
  
    val deviceName: String,
  
  ) {
    
    
  }
      
        @kotlinx.serialization.Serializable
  public data class DevicesItem(
  
    val deviceName: String,
  
  ) {
    
    
  }
      
    
    
  }
  

  public companion object {
    public val operationName: String = "DeviceRead"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
      kotlinx.serialization.serializer()
  }
}

public fun DeviceReadQuery.ref(
  
): com.google.firebase.dataconnect.QueryRef<
    DeviceReadQuery.Data,
    Unit
  > =
  ref(
    
      Unit
    
  )

public suspend fun DeviceReadQuery.execute(

  
    fetchPolicy: com.google.firebase.dataconnect.QueryRef.FetchPolicy = com.google.firebase.dataconnect.QueryRef.FetchPolicy.PREFER_CACHE,
  

  ): com.google.firebase.dataconnect.QueryResult<
    DeviceReadQuery.Data,
    Unit
  > =
  ref(
    
  ).execute(fetchPolicy = fetchPolicy)


  public fun DeviceReadQuery.flow(
    
    ): kotlinx.coroutines.flow.Flow<DeviceReadQuery.Data> =
    ref(
        
      ).subscribe()
      .flow
      ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
      ._flow_filterNotNull()
      ._flow_map { it.data }

