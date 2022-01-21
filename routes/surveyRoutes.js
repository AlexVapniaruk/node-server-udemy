const requireLogin = require('../middlewares/requireLogin');
const requireCredits = require('../middlewares/requireCredits');
const mongoose = require('mongoose');
const Mailer = require('../services/Mailer')
const surveyTemplate = require('../services/emailTemplates/surveyTemplate');
const Survey = mongoose.model('surveys');
const _ = require('lodash');
const { Path } = require('path-parser');
const { URL } = require('url');

module.exports = app => {
    app.get('/api/surveys/thanks', (req, res) => {
        res.send('Thanks for voting!');
    });
    
    app.post(
        '/api/surveys', 
        requireLogin, 
        requireCredits, 
        async (req, res) => {
            const { title, subject, body, recipients } = req.body;

            const survey = new Survey({
                title,
                body,
                subject,
                recipients: recipients.split(',').map(email => ({ email: email.trim() })),
                _user: req.user.id,
                dateSent: Date.now()
            });

            const mailer = new Mailer(survey, surveyTemplate(survey));
            try {
                //await mailer.send();
                await survey.save();
                req.user.credits -= 1;
                const user = await req.user.save();
                res.send(user);
            } catch(err) {
                res.status(422).send(err);
            }
        }
    );

    app.post('/api/surveys/webhooks', (req, res) => {
        console.log(req.body);
        const p = new Path('/api/surveys:surveyId/:choice');

        const events = _.map(req.body, ({ email, url }) => {
            const match = p.test(new URL(url).pathname);

            if (match) {
                return { email: email, surveyId: match.surveyId, choice: match.choice }
            }

            const compactEvents = _.compact(events);
            const uniqueEvents = _.uniqBy(compactEvents, 'email', 'surveyId');

            console.log(uniqueEvents);
        });
    });
}