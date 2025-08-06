const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});

// Email transporter configuration
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Generate email using Groq API
app.post('/api/generate-email', async (req, res) => {
  try {
    const { prompt, recipients } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a professional email writer. Generate a well-structured, professional email based on the user's prompt. Include a clear subject line and body. Format your response as JSON with 'subject' and 'body' fields."
        },
        {
          role: "user",
          content: `Generate an email for the following prompt: ${prompt}. The email will be sent to: ${recipients.join(', ')}`
        }
      ],
      model: "llama3-8b-8192",
      temperature: 0.7,
      max_tokens: 1000
    });

    let emailContent;
    try {
      emailContent = JSON.parse(completion.choices[0].message.content);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response
      const content = completion.choices[0].message.content;
      const lines = content.split('\n');
      const subject = lines.find(line => line.toLowerCase().includes('subject')) || 'Generated Email';
      const body = content;
      
      emailContent = {
        subject: subject.replace(/subject:?\s*/i, '').trim(),
        body: body
      };
    }

    res.json({
      success: true,
      email: emailContent
    });

  } catch (error) {
    console.error('Error generating email:', error);
    res.status(500).json({ 
      error: 'Failed to generate email',
      details: error.message 
    });
  }
});

// Send email
app.post('/api/send-email', async (req, res) => {
  try {
    const { recipients, subject, body } = req.body;

    if (!recipients || !subject || !body) {
      return res.status(400).json({ 
        error: 'Recipients, subject, and body are required' 
      });
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"GoMail" <${process.env.EMAIL_USER}>`,
      to: recipients.join(', '),
      subject: subject,
      html: body.replace(/\n/g, '<br>'),
      text: body // Also include plain text version
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Email sent successfully',
      messageId: info.messageId
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
