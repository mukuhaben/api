import express from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import { v4 as uuidv4 } from "uuid"
import sharp from "sharp"
import { verifyToken, requireAuthenticated } from "../middlewares/auth.js"

const router = express.Router()

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), "uploads")
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Create subdirectories
const subdirs = ["products", "profiles", "categories", "temp"]
subdirs.forEach((subdir) => {
  const dirPath = path.join(uploadsDir, subdir)
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
})

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.params.type || "temp"
    const uploadPath = path.join(uploadsDir, uploadType)
    cb(null, uploadPath)
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype = allowedTypes.test(file.mimetype)

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error("Only image files are allowed (jpeg, jpg, png, gif, webp)"))
  }
}

// File filter for documents
const documentFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx|xls|xlsx|txt/
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
  const mimetype =
    allowedTypes.test(file.mimetype) || file.mimetype.includes("document") || file.mimetype.includes("spreadsheet")

  if (mimetype && extname) {
    return cb(null, true)
  } else {
    cb(new Error("Only document files are allowed (pdf, doc, docx, xls, xlsx, txt)"))
  }
}

// Configure multer instances
const uploadImage = multer({
  storage: storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
})

const uploadDocument = multer({
  storage: storage,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

const uploadAny = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
})

// Image processing function
const processImage = async (inputPath, outputPath, options = {}) => {
  const { width = 800, height = 600, quality = 80 } = options

  try {
    await sharp(inputPath)
      .resize(width, height, {
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality })
      .toFile(outputPath)

    // Delete original file if processing was successful
    if (inputPath !== outputPath) {
      fs.unlinkSync(inputPath)
    }

    return true
  } catch (error) {
    console.error("Image processing error:", error)
    return false
  }
}

// Upload single image
router.post("/image/:type", verifyToken, requireAuthenticated, (req, res) => {
  const uploadType = req.params.type

  if (!["products", "profiles", "categories"].includes(uploadType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid upload type",
    })
  }

  uploadImage.single("image")(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      })
    }

    try {
      const originalPath = req.file.path
      const processedPath = path.join(path.dirname(originalPath), `processed_${req.file.filename}`)

      // Process image based on type
      let processOptions = {}
      switch (uploadType) {
        case "products":
          processOptions = { width: 800, height: 600, quality: 85 }
          break
        case "profiles":
          processOptions = { width: 300, height: 300, quality: 80 }
          break
        case "categories":
          processOptions = { width: 400, height: 300, quality: 80 }
          break
      }

      const processed = await processImage(originalPath, processedPath, processOptions)

      if (!processed) {
        return res.status(500).json({
          success: false,
          message: "Failed to process image",
        })
      }

      const fileUrl = `/uploads/${uploadType}/processed_${req.file.filename}`

      res.json({
        success: true,
        message: "Image uploaded successfully",
        data: {
          filename: `processed_${req.file.filename}`,
          originalName: req.file.originalname,
          url: fileUrl,
          size: fs.statSync(processedPath).size,
          mimetype: "image/jpeg",
        },
      })
    } catch (error) {
      console.error("Upload processing error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to process upload",
      })
    }
  })
})

// Upload multiple images
router.post("/images/:type", verifyToken, requireAuthenticated, (req, res) => {
  const uploadType = req.params.type

  if (!["products", "categories"].includes(uploadType)) {
    return res.status(400).json({
      success: false,
      message: "Invalid upload type",
    })
  }

  uploadImage.array("images", 10)(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      })
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      })
    }

    try {
      const processedFiles = []

      for (const file of req.files) {
        const originalPath = file.path
        const processedPath = path.join(path.dirname(originalPath), `processed_${file.filename}`)

        const processOptions = { width: 800, height: 600, quality: 85 }
        const processed = await processImage(originalPath, processedPath, processOptions)

        if (processed) {
          const fileUrl = `/uploads/${uploadType}/processed_${file.filename}`
          processedFiles.push({
            filename: `processed_${file.filename}`,
            originalName: file.originalname,
            url: fileUrl,
            size: fs.statSync(processedPath).size,
            mimetype: "image/jpeg",
          })
        }
      }

      res.json({
        success: true,
        message: `${processedFiles.length} images uploaded successfully`,
        data: {
          files: processedFiles,
        },
      })
    } catch (error) {
      console.error("Multiple upload processing error:", error)
      res.status(500).json({
        success: false,
        message: "Failed to process uploads",
      })
    }
  })
})

// Upload document
router.post("/document/:type", verifyToken, requireAuthenticated, (req, res) => {
  const uploadType = req.params.type || "temp"

  uploadDocument.single("document")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      })
    }

    const fileUrl = `/uploads/${uploadType}/${req.file.filename}`

    res.json({
      success: true,
      message: "Document uploaded successfully",
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    })
  })
})

// Upload any file type
router.post("/file/:type", verifyToken, requireAuthenticated, (req, res) => {
  const uploadType = req.params.type || "temp"

  uploadAny.single("file")(req, res, (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      })
    }

    const fileUrl = `/uploads/${uploadType}/${req.file.filename}`

    res.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      },
    })
  })
})

// Delete file
router.delete("/file/:type/:filename", verifyToken, requireAuthenticated, (req, res) => {
  try {
    const { type, filename } = req.params

    // Validate type
    if (!["products", "profiles", "categories", "temp"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      })
    }

    // Validate filename to prevent directory traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({
        success: false,
        message: "Invalid filename",
      })
    }

    const filePath = path.join(uploadsDir, type, filename)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      })
    }

    // Delete file
    fs.unlinkSync(filePath)

    res.json({
      success: true,
      message: "File deleted successfully",
    })
  } catch (error) {
    console.error("Delete file error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to delete file",
    })
  }
})

// Get file info
router.get("/file/:type/:filename", (req, res) => {
  try {
    const { type, filename } = req.params

    // Validate type
    if (!["products", "profiles", "categories", "temp"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      })
    }

    // Validate filename
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({
        success: false,
        message: "Invalid filename",
      })
    }

    const filePath = path.join(uploadsDir, type, filename)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      })
    }

    const stats = fs.statSync(filePath)
    const fileUrl = `/uploads/${type}/${filename}`

    res.json({
      success: true,
      data: {
        filename,
        url: fileUrl,
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      },
    })
  } catch (error) {
    console.error("Get file info error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to get file info",
    })
  }
})

// List files in directory
router.get("/files/:type", verifyToken, requireAuthenticated, (req, res) => {
  try {
    const { type } = req.params
    const { page = 1, limit = 20 } = req.query

    // Validate type
    if (!["products", "profiles", "categories", "temp"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      })
    }

    const dirPath = path.join(uploadsDir, type)

    if (!fs.existsSync(dirPath)) {
      return res.json({
        success: true,
        data: {
          files: [],
          pagination: {
            page: Number.parseInt(page),
            limit: Number.parseInt(limit),
            total: 0,
            pages: 0,
          },
        },
      })
    }

    const files = fs.readdirSync(dirPath)
    const fileInfos = files
      .map((filename) => {
        const filePath = path.join(dirPath, filename)
        const stats = fs.statSync(filePath)
        return {
          filename,
          url: `/uploads/${type}/${filename}`,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isDirectory: stats.isDirectory(),
        }
      })
      .filter((file) => !file.isDirectory)
      .sort((a, b) => new Date(b.created) - new Date(a.created))

    // Pagination
    const offset = (page - 1) * limit
    const paginatedFiles = fileInfos.slice(offset, offset + limit)

    res.json({
      success: true,
      data: {
        files: paginatedFiles,
        pagination: {
          page: Number.parseInt(page),
          limit: Number.parseInt(limit),
          total: fileInfos.length,
          pages: Math.ceil(fileInfos.length / limit),
        },
      },
    })
  } catch (error) {
    console.error("List files error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to list files",
    })
  }
})

// Serve uploaded files
router.get("/serve/:type/:filename", (req, res) => {
  try {
    const { type, filename } = req.params

    // Validate type
    if (!["products", "profiles", "categories", "temp"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      })
    }

    // Validate filename
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return res.status(400).json({
        success: false,
        message: "Invalid filename",
      })
    }

    const filePath = path.join(uploadsDir, type, filename)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      })
    }

    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase()
    let contentType = "application/octet-stream"

    switch (ext) {
      case ".jpg":
      case ".jpeg":
        contentType = "image/jpeg"
        break
      case ".png":
        contentType = "image/png"
        break
      case ".gif":
        contentType = "image/gif"
        break
      case ".webp":
        contentType = "image/webp"
        break
      case ".pdf":
        contentType = "application/pdf"
        break
      case ".doc":
        contentType = "application/msword"
        break
      case ".docx":
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        break
    }

    res.setHeader("Content-Type", contentType)
    res.setHeader("Cache-Control", "public, max-age=31536000") // Cache for 1 year

    // Stream the file
    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  } catch (error) {
    console.error("Serve file error:", error)
    res.status(500).json({
      success: false,
      message: "Failed to serve file",
    })
  }
})

export default router
