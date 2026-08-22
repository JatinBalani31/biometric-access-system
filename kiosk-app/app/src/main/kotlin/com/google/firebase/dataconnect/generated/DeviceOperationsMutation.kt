
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



public interface DeviceOperationsMutation :
    com.google.firebase.dataconnect.generated.GeneratedMutation<
      ExampleConnector,
      DeviceOperationsMutation.Data,
      DeviceOperationsMutation.Variables
    >
{
  
    @kotlinx.serialization.Serializable
  public data class Variables(
  
    val deviceName: String,
  
    val publicKey: String,
  
  ) {
    
    
  }
  

  
    @kotlinx.serialization.Serializable
  public data class Data(
  
    val device_insert: DeviceKey,
  
    val device_update: DeviceKey?,
  
    val device_delete: DeviceKey?,
  
  ) {
    
    
  }
  

  public companion object {
    public val operationName: String = "DeviceOperations"

    public val dataDeserializer: kotlinx.serialization.DeserializationStrategy<Data> =
      kotlinx.serialization.serializer()

    public val variablesSerializer: kotlinx.serialization.SerializationStrategy<Variables> =
      kotlinx.serialization.serializer()
  }
}

public fun DeviceOperationsMutation.ref(
  
    deviceName: String,publicKey: String,

  
  
): com.google.firebase.dataconnect.MutationRef<
    DeviceOperationsMutation.Data,
    DeviceOperationsMutation.Variables
  > =
  ref(
    
      DeviceOperationsMutation.Variables(
        deviceName=deviceName,publicKey=publicKey,
  
      )
    
  )

public suspend fun DeviceOperationsMutation.execute(

  
    
      deviceName: String,publicKey: String,

  

  ): com.google.firebase.dataconnect.MutationResult<
    DeviceOperationsMutation.Data,
    DeviceOperationsMutation.Variables
  > =
  ref(
    
      deviceName=deviceName,publicKey=publicKey,
  
    
  ).execute()


