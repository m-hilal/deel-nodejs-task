const express = require('express');
const bodyParser = require('body-parser');
const {sequelize} = require('./model')
const {getProfile} = require('./middleware/getProfile')
const app = express();
app.use(bodyParser.json());
app.set('sequelize', sequelize)
app.set('models', sequelize.models)
const { Op } = require('sequelize');

/**
 * Get Contract By ID
 * @returns contract by id
 */
app.get('/contracts/:id',getProfile ,async (req, res) =>{

    if(req.profile.type == 'client'){
        whereClause =  {ClientId : req.profile.id}
    }else{
        whereClause =  {ContractorId : req.profile.id}
    }

    const {Contract} = req.app.get('models')
    const {id} = req.params
    const contract = await Contract.findOne({where: {id, ...whereClause}})
    if(!contract) return res.status(404).end()
    res.json(contract)
})

/**
 * Get All Contracts
 * @returns All Contracts
 */
app.get('/contracts',getProfile ,async (req, res) =>{

    if(req.profile.type == 'client'){
        whereClause =  {ClientId : req.profile.id}
    }else{
        whereClause =  {ContractorId : req.profile.id}
    }

    const {Contract} = req.app.get('models')
    const contract = await Contract.findAll({where: { ...whereClause, status: {[Op.not]: "terminated"}}});
    if(!contract) return res.status(404).end()
    res.json(contract)
})


/**
 * Get all unpaid jobs for a user
 * @returns Get all unpaid jobs for a user
 */
app.get('/jobs/unpaid', getProfile, async (req, res) => {

    if (req.profile.type == 'client') {
        whereClause = { ClientId: req.profile.id }
    } else {
        whereClause = { ContractorId: req.profile.id }
    }

    const { Job, Contract } = req.app.get('models')
    const jobs = await Job.findAll({
        include: [
            {
                model: Contract,
                required: true,
                where: { ...whereClause, status: { [Op.eq]: "in_progress" } }
            }, 
        ],
        where: {
            paid: null
        },
    }
)
    if (!jobs) return res.status(404).end()
    res.json(jobs)
})

module.exports = app;
