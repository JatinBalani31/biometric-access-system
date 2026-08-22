
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


public interface UserReadQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
      ExampleConnector,
      UserReadQuery.Data,
      Unit
    >
{
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val user: User?,
  
    val users: List<UsersItem>,
  
  ) {
    
      
        @kotlinx.serialization.Serializable
  public data class User(
  
    val email: String,
  
    val subscriptionStatus: String,
  
  ) {
    
    
  }
      
        @kotlinx.serialization.Serializable
  public data class UsersItem(
  
    val email: String,
  
  ) {
    
    
  }
      
    
    
  }
  

  public companion object {
    public val operationName: String = "UserRead"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
      kotlinx.serialization.serializer()
  }
}

public fun UserReadQuery.ref(
  
): com.google.firebase.dataconnect.QueryRef<
    UserReadQuery.Data,
    Unit
  > =
  ref(
    
      Unit
    
  )

public suspend fun UserReadQuery.execute(

  
    fetchPolicy: com.google.firebase.dataconnect.QueryRef.FetchPolicy = com.google.firebase.dataconnect.QueryRef.FetchPolicy.PREFER_CACHE,
  

  ): com.google.firebase.dataconnect.QueryResult<
    UserReadQuery.Data,
    Unit
  > =
  ref(
    
  ).execute(fetchPolicy = fetchPolicy)


  public fun UserReadQuery.flow(
    
    ): kotlinx.coroutines.flow.Flow<UserReadQuery.Data> =
    ref(
        
      ).subscribe()
      .flow
      ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
      ._flow_filterNotNull()
      ._flow_map { it.data }

