
import Userkey from '../models/userkeys.model.js';
import Contactkey from '../models/contactkey.model.js';

export async function getUserPrivateKey(req, res) {
    try {
      console.log("target hit request private key")
      const userId = req.user.id; 
      console.log(userId)
      const userKeys = await Userkey.findOne({ userId });
      console.log(userKeys)
      if (!userKeys) {
        return res.status(200).json({ 
          success: true, 
          privateKey: null,
          message: 'No keys found for this user' 
        });
      }
      
      return res.status(200).json({
        success: true,
        privateKey: userKeys.privateKey
      });
      
    } catch (error) {
      console.error('Error retrieving private key:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve private key',
        error: error.message
      });
    }
  }


export async function getReceiverPublicKey(req, res) {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required.',
      });
    }

    const userKeys = await Userkey.findOne({ userId }); 

    if (!userKeys) {
      return res.status(404).json({
        success: false,
        message: 'No key found for this user',
      });
    }

    return res.status(200).json({
      success: true,
      receiverPublicKey: userKeys.publicKey,
    });

  } catch (error) {
    console.error('Error retrieving public key:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve public key',
      error: error.message,
    });
  }
}


export async function getContactPublicKey(req, res) {
  try {
    const { id: userToChatId } = req.params; 
    const senderId = req.user._id; 

    const contactDoc = await Contactkey.findOne(
      {
        userId: senderId,
        "contacts.contactId": userToChatId
      },
      {
        "contacts.$": 1, 
        _id: 0
      }
    );

    if (!contactDoc || !contactDoc.contacts || contactDoc.contacts.length === 0) {
      return res.status(200).json({ 
        message: "Public key not found2" });
    }

    const { publicKey, evolutioncount } = contactDoc.contacts[0];

    res.status(200).json({ publicKey, evolutioncount });

  } catch (error) {
    console.error("Error in getContactPublicKey controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function updateEvolutionCount(req, res) {
  try {
    const { id: contactId } = req.params; // ID of the contact to update
    const senderId = req.user._id;        // Current logged-in user
    const { evolutioncount } = req.body;  // New count value

    const result = await Contactkey.updateOne(
      { userId: senderId, "contacts.contactId": contactId },
      {
        $set: {
          "contacts.$.evolutioncount": evolutioncount
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.status(200).json({ message: "Evolution count updated successfully" });

  } catch (error) {
    console.error("Error in updateEvolutionCount controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}



export async function updateContactPublicKey(req, res) {
  try {
    const { id: contactId } = req.params;
    const senderId = req.user._id; // senderId from authenticated user
    const { publicKey } = req.body;

    console.log(`Sender ID: ${senderId}, Contact ID: ${contactId}, Public Key: ${publicKey}`);
    console.log(req.body)

    // First, try to update the contact if it already exists
    const result = await Contactkey.updateOne(
      { userId: senderId, "contacts.contactId": contactId },
      {
        $set: {
          "contacts.$.publicKey": publicKey, // Update the contact if it exists
        },
      }
    );

    // If no match was found (no update occurred), we need to insert the user document
    if (result.matchedCount === 0) {
      console.log("Contact not found, checking if user document exists...");

      // Try to find if the user document exists
      const userDocument = await Contactkey.findOne({ userId: senderId });

      // If the user document doesn't exist, create a new one
      if (!userDocument) {
        console.log("No user document found, creating a new one with contact...");

        const newContact = {
          contactId,
          publicKey,
          evolutioncount: 0, // Default evolutioncount
        };

        // Create a new Contactkey document for the user
        const newContactKey = new Contactkey({
          userId: senderId,
          contacts: [newContact],
        });

        // Save the new Contactkey document to the database
        await newContactKey.save();

        return res.status(201).json({
          message: "New user document created and public key added to contact.",
        });
      }

      // If the user document exists, but the contact does not exist, push the new contact
      console.log("User document found, adding new contact...");

      const newContact = {
        contactId,
        publicKey,
        evolutioncount: 0, // Default evolutioncount
      };

      const updatedDoc = await Contactkey.updateOne(
        { userId: senderId },
        {
          $push: {
            contacts: newContact, // Push the new contact into the contacts array
          },
        }
      );

      // Log the updated document after the push operation
      console.log("Updated document:", updatedDoc);

      // Check if the document was updated
      if (updatedDoc.modifiedCount > 0) {
        return res.status(200).json({
          message: "New contact created and public key added",
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Failed to add new contact",
        });
      }
    }

    // If the contact was found and updated
    res.status(200).json({ message: "Public key updated successfully" });

  } catch (error) {
    console.error("Error in updatePublicKey controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}



export async function upsertUserKeys(req, res) {
  try {
    const userId = req.user.id;
    const { publicKey, privateKey } = req.body;
    console.log(req.body)

    if (!publicKey || !privateKey) {
      return res.status(400).json({ error: "Both publicKey and privateKey are required." });
    }

    const result = await Userkey.updateOne(
      { userId },
      {
        $set: { publicKey, privateKey }
      },
      { upsert: true }
    );

    res.status(200).json({ message: "User keys saved successfully." });

  } catch (error) {
    console.error("Error in upsertUserKeys controller:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
}


