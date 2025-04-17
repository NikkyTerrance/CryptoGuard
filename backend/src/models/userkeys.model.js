import mongoose from "mongoose";

const userKeysSchema = new mongoose.Schema({
    userId: {
      type: String,
      required: true,
      unique: true
    },
    publicKey: {
      type: String,
      required: true
    },
    privateKey: {
      type: String,
      required: true
    },
    
  });
  
  const Userkey = mongoose.model('Userkey', userKeysSchema);

  export default Userkey;