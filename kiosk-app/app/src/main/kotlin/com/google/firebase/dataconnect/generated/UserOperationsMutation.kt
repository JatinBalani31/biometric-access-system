
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



public interface UserOperationsMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      ExampleConnector,
      UserOperationsMutation.Data,
      UserOperationsMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val email: String,
  
    val subscriptionStatus: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val user_insert: UserKey,
  
    val user_update: UserKey?,
  
    val user_delete: UserKey?,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "UserOperations"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun UserOperationsMutation.ref(
  
    email: String,subscriptionStatus: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    UserOperationsMutation.Data,
    UserOperationsMutation.Variables
  > =
  ref(
    
      UserOperationsMutation.Variables(
        email=email,subscriptionStatus=subscriptionStatus,
  
      )
    
  )

public suspend fun UserOperationsMutation.execute(

  
    
      email: String,subscriptionStatus: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    UserOperationsMutation.Data,
    UserOperationsMutation.Variables
  > =
  ref(
    
      email=email,subscriptionStatus=subscriptionStatus,
  
    
  ).execute()


