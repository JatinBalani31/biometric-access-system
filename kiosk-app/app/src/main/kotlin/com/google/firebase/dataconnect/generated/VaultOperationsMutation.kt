
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



public interface VaultOperationsMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      ExampleConnector,
      VaultOperationsMutation.Data,
      VaultOperationsMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val title: String,
  
    val encryptedContent: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val vaultItem_insert: VaultItemKey,
  
    val vaultItem_update: VaultItemKey?,
  
    val vaultItem_delete: VaultItemKey?,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "VaultOperations"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun VaultOperationsMutation.ref(
  
    title: String,encryptedContent: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    VaultOperationsMutation.Data,
    VaultOperationsMutation.Variables
  > =
  ref(
    
      VaultOperationsMutation.Variables(
        title=title,encryptedContent=encryptedContent,
  
      )
    
  )

public suspend fun VaultOperationsMutation.execute(

  
    
      title: String,encryptedContent: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    VaultOperationsMutation.Data,
    VaultOperationsMutation.Variables
  > =
  ref(
    
      title=title,encryptedContent=encryptedContent,
  
    
  ).execute()


