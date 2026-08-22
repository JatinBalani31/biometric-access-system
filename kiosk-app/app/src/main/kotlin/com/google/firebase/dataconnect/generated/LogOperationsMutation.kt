
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



public interface LogOperationsMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      ExampleConnector,
      LogOperationsMutation.Data,
      LogOperationsMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val status: String,
  
    val ipAddress: String,
  
    val appId: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
    val deviceId: @kotlinx.serialization.Serializable(with = com.google.firebase.dataconnect.serializers.UUIDSerializer::class) java.util.UUID,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val authLog_insert: AuthLogKey,
  
    val authLog_update: AuthLogKey?,
  
    val authLog_delete: AuthLogKey?,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "LogOperations"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun LogOperationsMutation.ref(
  
    status: String,ipAddress: String,appId: java.util.UUID,deviceId: java.util.UUID,

  
  
): com.google.firebase.dataconnect.MutationRef<
    LogOperationsMutation.Data,
    LogOperationsMutation.Variables
  > =
  ref(
    
      LogOperationsMutation.Variables(
        status=status,ipAddress=ipAddress,appId=appId,deviceId=deviceId,
  
      )
    
  )

public suspend fun LogOperationsMutation.execute(

  
    
      status: String,ipAddress: String,appId: java.util.UUID,deviceId: java.util.UUID,

  

  ): com.google.firebase.dataconnect.MutationResult<
    LogOperationsMutation.Data,
    LogOperationsMutation.Variables
  > =
  ref(
    
      status=status,ipAddress=ipAddress,appId=appId,deviceId=deviceId,
  
    
  ).execute()


