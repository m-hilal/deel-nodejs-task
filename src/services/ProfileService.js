const ProfileRepository  = require('../repositories/ProfileRepository');

class ProfileService {

  constructor() {
    this.ProfileRepository = new ProfileRepository();
  }

  async getAllProfiles() {
    try {

      const profiles = await this.ProfileRepository.getAllProfiles();
      return profiles

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = new ProfileService();
