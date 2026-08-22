
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


public interface PartnerAppsPublicQuery :
    com.google.firebase.dataconnect.generated.GeneratedQuery<
      ExampleConnector,
      PartnerAppsPublicQuery.Data,
      Unit
    >
{
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val partnerApps: List<PartnerAppsItem>,
  
  ) {
    
      
        @kotlinx.serialization.Serializable
  public data class PartnerAppsItem(
  
    val appName: String,
  
    val organizationName: String?,
  
  ) {
    
    
  }
      
    
    
  }
  

  public companion object {
    public val operationName: String = "PartnerAppsPublic"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Unit> =
      kotlinx.serialization.serializer()
  }
}

public fun PartnerAppsPublicQuery.ref(
  
): com.google.firebase.dataconnect.QueryRef<
    PartnerAppsPublicQuery.Data,
    Unit
  > =
  ref(
    
      Unit
    
  )

public suspend fun PartnerAppsPublicQuery.execute(

  
    fetchPolicy: com.google.firebase.dataconnect.QueryRef.FetchPolicy = com.google.firebase.dataconnect.QueryRef.FetchPolicy.PREFER_CACHE,
  

  ): com.google.firebase.dataconnect.QueryResult<
    PartnerAppsPublicQuery.Data,
    Unit
  > =
  ref(
    
  ).execute(fetchPolicy = fetchPolicy)


  public fun PartnerAppsPublicQuery.flow(
    
    ): kotlinx.coroutines.flow.Flow<PartnerAppsPublicQuery.Data> =
    ref(
        
      ).subscribe()
      .flow
      ._flow_map { querySubscriptionResult -> querySubscriptionResult.result.getOrNull() }
      ._flow_filterNotNull()
      ._flow_map { it.data }

