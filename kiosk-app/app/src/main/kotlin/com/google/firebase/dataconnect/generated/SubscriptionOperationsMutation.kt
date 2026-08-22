
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



public interface SubscriptionOperationsMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      ExampleConnector,
      SubscriptionOperationsMutation.Data,
      SubscriptionOperationsMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val planType: String,
  
    val startDate: com.google.firebase.dataconnect.LocalDate,
  
    val expiryDate: com.google.firebase.dataconnect.LocalDate,
  
    val status: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val userSubscription_insert: UserSubscriptionKey,
  
    val userSubscription_update: UserSubscriptionKey?,
  
    val userSubscription_delete: UserSubscriptionKey?,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "SubscriptionOperations"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun SubscriptionOperationsMutation.ref(
  
    planType: String,startDate: com.google.firebase.dataconnect.LocalDate,expiryDate: com.google.firebase.dataconnect.LocalDate,status: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    SubscriptionOperationsMutation.Data,
    SubscriptionOperationsMutation.Variables
  > =
  ref(
    
      SubscriptionOperationsMutation.Variables(
        planType=planType,startDate=startDate,expiryDate=expiryDate,status=status,
  
      )
    
  )

public suspend fun SubscriptionOperationsMutation.execute(

  
    
      planType: String,startDate: com.google.firebase.dataconnect.LocalDate,expiryDate: com.google.firebase.dataconnect.LocalDate,status: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    SubscriptionOperationsMutation.Data,
    SubscriptionOperationsMutation.Variables
  > =
  ref(
    
      planType=planType,startDate=startDate,expiryDate=expiryDate,status=status,
  
    
  ).execute()


