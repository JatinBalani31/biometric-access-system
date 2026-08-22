
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


public interface SubscriptionReadQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
      ExampleConnector,
      SubscriptionReadQuery.Data,
      Unit
    >
{
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val userSubscription: UserSubscription?,
  
    val userSubscriptions: List<UserSubscriptionsItem>,
  
  ) {
    
      
        @kotlinx.serialization.Serializable
  public data class UserSubscription(
  
    val planType: String,
  
    val status: String,
  
  ) {
    
    
  }
      
        @kotlinx.serialization.Serializable
  public data class UserSubscriptionsItem(
  
    val planType: String,
  
  ) {
    
    
  }
      
    
    
  }
  

  public companion object {
    public val operationName: String = "SubscriptionRead"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
      kotlinx.serialization.serializer()
  }
}

public fun SubscriptionReadQuery.ref(
  
): com.google.firebase.dataconnect.QueryRef<
    SubscriptionReadQuery.Data,
    Unit
  > =
  ref(
    
      Unit
    
  )

public suspend fun SubscriptionReadQuery.execute(

  
    fetchPolicy: com.google.firebase.dataconnect.QueryRef.FetchPolicy = com.google.firebase.dataconnect.QueryRef.FetchPolicy.PREFER_CACHE,
  

  ): com.google.firebase.dataconnect.QueryResult<
    SubscriptionReadQuery.Data,
    Unit
  > =
  ref(
    
  ).execute(fetchPolicy = fetchPolicy)


  public fun SubscriptionReadQuery.flow(
    
    ): kotlinx.coroutines.flow.Flow<SubscriptionReadQuery.Data> =
    ref(
        
      ).subscribe()
      .flow
      ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
      ._flow_filterNotNull()
      ._flow_map { it.data }

