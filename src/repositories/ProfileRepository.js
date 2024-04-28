const { Profile } = require('../models/model');

class ProfileRepository {

  constructor() {
    this.model = Profile;
  }

  async getAllProfiles() {
    try {
      const profiles = await Profile.findAll();
      return profiles;
    } catch (error) {
      throw error;
    }
  }
}
module.exports = ProfileRepository;