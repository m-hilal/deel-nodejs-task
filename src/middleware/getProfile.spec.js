const { getProfile } = require('./getProfile');
const model = require('../models/model');

var mockProfile = {
    id: 1,
    firstName: 'Harry',
    lastName: 'Potter',
    profession: 'Wizard',
    balance: 1150,
    type:'client'
  };
  

describe('Get Profile middleware', () => {
  

  it('should set req.profile if profile is found', async () => {
    const models = {
      Profile: {
        findOne: jest.fn().mockResolvedValue(mockProfile),
      }
    };
    const req = { app: { get: jest.fn().mockReturnValue(models) }, get: jest.fn() };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    await getProfile(req, res, next);

    expect(req.profile).toEqual(mockProfile);
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 if profile is not found', async () => {
    const req = { app: { get: jest.fn() }, get: jest.fn() };
    const res = { status: jest.fn().mockReturnThis(), end: jest.fn() };
    const next = jest.fn();

    const models = {
      Profile: {
        findOne: jest.fn().mockResolvedValue({}),
      }
    };

    req.get.mockReturnValue(undefined); // No profile_id header
    req.app.get.mockReturnValue(models);
    req.app.get('models').Profile.findOne.mockResolvedValue(null);

    await getProfile(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.end).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });
});
