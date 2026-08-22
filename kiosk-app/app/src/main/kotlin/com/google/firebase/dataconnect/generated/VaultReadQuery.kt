
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


public interface VaultReadQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
      ExampleConnector,
      VaultReadQuery.Data,
      Unit
    >
{
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val vaultItem: VaultItem?,
  
    val vaultItems: List<VaultItemsItem>,
  
  ) {
    
      
        @kotlinx.serialization.Serializable
  public data class VaultItem(
  
    val title: String,
  
  ) {
    
    
  }
      
        @kotlinx.serialization.Serializable
  public data class VaultItemsItem(
  
    val title: String,
  
  ) {
    
    
  }
      
    
    
  }
  

  public companion object {
    public val operationName: String = "VaultRead"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
      kotlinx.serialization.serializer()
  }
}

public fun VaultReadQuery.ref(
  
): com.google.firebase.dataconnect.QueryRef<
    VaultReadQuery.Data,
    Unit
  > =
  ref(
    
      Unit
    
  )

public suspend fun VaultReadQuery.execute(

  
    fetchPolicy: com.google.firebase.dataconnect.QueryRef.FetchPolicy = com.google.firebase.dataconnect.QueryRef.FetchPolicy.PREFER_CACHE,
  

  ): com.google.firebase.dataconnect.QueryResult<
    VaultReadQuery.Data,
    Unit
  > =
  ref(
    
  ).execute(fetchPolicy = fetchPolicy)


  public fun VaultReadQuery.flow(
    
    ): kotlinx.coroutines.flow.Flow<VaultReadQuery.Data> =
    ref(
        
      ).subscribe()
      .flow
      ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
      ._flow_filterNotNull()
      ._flow_map { it.data }

