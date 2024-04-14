const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const File = require("../models/file");
const { v4: uuid4 } = require("uuid");
let storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9
    )}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

let upload = multer({
  storage,
  limits: { fileSize: 100000 * 100 },
}).single("myfile");

router.post("/", (req, res) => {
  //validate request

  //store file

  upload(req, res, async (err) => {
    if (!req.file) {
      return res.json({ erroe: "All fields are required" });
    }

    if (err) {
      return res.status(500).send({ error: error.message });
    }

    // store in database
    const file = new File({
      filename: req.file.filename,
      uuid: uuid4(),
      path: req.file.path,
      size: req.file.size,
    });

    const response = await file.save();

    return res.json({
      file: `${process.env.APP_BASE_URL}/files/${response.uuid}`,
    });
  });

  //responce --> link
});

router.post("/send", async (req, res) => {
  const { uuid, emailTo, emailFrom } = req.body;

  if (!uuid || !emailTo || !emailFrom) {
    return res.status(422).send({ erroe: "All fields are required" });
  }

  const file = await File.findOne({ uuid: uuid });
  if (file.sender) {
    return res.status(422).send({ erroe: "email already send" });
  }

  file.sender = emailFrom;
  file.receiver = emailTo;
  const response = await file.save();

  //send email
  const sendMail = require("../services/emailService");

  sendMail({
    from: emailFrom,
    to: emailTo,
    subject: "inshare file sharing",
    text: `${emailFrom} shared file with you`,
    html: require("../services/emailTemplate")({
      emailFrom,
      downloadLink: `${process.env.APP_BASE_URL}/files/${file.uuid}?source=email`,
      size: parseInt(file.size / 1000) + " KB",
      expires: "24 hours",
    }),
  });
  return res.send({ success: true });
});

module.exports = router;
