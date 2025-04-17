import mongoose from "mongoose";

const contactKeysSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    comment: 'ID of the user who owns this contact list'
  },
  contacts: [{
    contactId: {
      type: String,
      required: true
    },
    publicKey: {
      type: String,
      required: true
    },
    evolutioncount: {
      type: Number,
      default: 0
    }
  }]
});

const Contactkey = mongoose.model('contactkey', contactKeysSchema);

export default Contactkey;