import Joi from "joi"

// Validation middleware factory
export const validate = (schema, property = "body") => {
  return (req, res, next) => {
    const { error } = schema.validate(req[property], { abortEarly: false })

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }))

      return res.status(400).json({
        success: false,
        message: "Validation error",
        errors,
      })
    }

    next()
  }
}

// Common validation schemas
export const schemas = {
  // User registration
  userRegistration: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    firstName: Joi.string().max(100),
    lastName: Joi.string().max(100),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    userType: Joi.string().valid("customer", "sales_agent").default("customer"),
    companyName: Joi.string().max(255),
    contactPerson: Joi.string().max(255),
    kraPin: Joi.string().max(50),
    cashbackPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  }),

  // User login
  userLogin: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
    userType: Joi.string().valid("customer", "sales_agent", "admin").default("customer"),
  }),

  // Product creation
  productCreation: Joi.object({
    productName: Joi.string().max(255).required(),
    productCode: Joi.string().max(100).required(),
    description: Joi.string(),
    longerDescription: Joi.string(),
    categoryId: Joi.string().uuid(),
    subcategoryId: Joi.string().uuid(),
    costPrice: Joi.number().positive().required(),
    vatRate: Joi.number().min(0).max(100).default(16),
    stockUnits: Joi.number().integer().min(0).required(),
    alertQuantity: Joi.number().integer().min(0).default(10),
    unitOfMeasure: Joi.string().max(20).default("PC"),
    cashbackRate: Joi.number().min(0).max(100).default(0),
    pricingTiers: Joi.array()
      .items(
        Joi.object({
          tierName: Joi.string().required(),
          minQuantity: Joi.number().integer().min(1).required(),
          maxQuantity: Joi.number().integer().min(1),
          sellingPrice: Joi.number().positive().required(),
        }),
      )
      .min(1)
      .required(),
  }),

  // Order creation
  orderCreation: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).required(),
        }),
      )
      .min(1)
      .required(),
    shippingAddress: Joi.object({
      buildingName: Joi.string(),
      floorNumber: Joi.string(),
      roomNumber: Joi.string(),
      streetName: Joi.string(),
      areaName: Joi.string().required(),
      city: Joi.string().required(),
      region: Joi.string(),
      country: Joi.string().default("Kenya"),
      postalCode: Joi.string(),
    }).required(),
    billingAddress: Joi.object({
      buildingName: Joi.string(),
      floorNumber: Joi.string(),
      roomNumber: Joi.string(),
      streetName: Joi.string(),
      areaName: Joi.string().required(),
      city: Joi.string().required(),
      region: Joi.string(),
      country: Joi.string().default("Kenya"),
      postalCode: Joi.string(),
    }),
    notes: Joi.string(),
  }),

  // Payment initiation
  paymentInitiation: Joi.object({
    orderId: Joi.string().uuid().required(),
    paymentMethod: Joi.string().valid("mpesa", "kcb").required(),
    phoneNumber: Joi.string()
      .pattern(/^\+?254[17]\d{8}$/)
      .required(),
  }),

  // Wallet withdrawal
  walletWithdrawal: Joi.object({
    amount: Joi.number().positive().min(100).required(),
    paymentMethod: Joi.string().valid("mpesa").required(),
    phoneNumber: Joi.string()
      .pattern(/^\+?254[17]\d{8}$/)
      .required(),
  }),

  // Category creation
  categoryCreation: Joi.object({
    name: Joi.string().max(255).required(),
    description: Joi.string(),
    parentId: Joi.string().uuid().allow(null),
    slug: Joi.string().max(255).required(),
  }),

  // Supplier creation
  supplierCreation: Joi.object({
    name: Joi.string().max(255).required(),
    company: Joi.string().max(255),
    contactPerson: Joi.string().max(255),
    email: Joi.string().email(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    address: Joi.string(),
    city: Joi.string().max(100),
    region: Joi.string().max(100),
    country: Joi.string().max(100).default("Kenya"),
    postalCode: Joi.string().max(20),
    kraPin: Joi.string().max(50),
    paymentTerms: Joi.string().max(100),
    creditLimit: Joi.number().min(0).default(0),
  }),

  // Purchase order creation
  purchaseOrderCreation: Joi.object({
    supplierId: Joi.string().uuid().required(),
    reference: Joi.string().max(100),
    orderDate: Joi.date().required(),
    dueDate: Joi.date(),
    warehouse: Joi.string().max(100),
    paymentTerms: Joi.string().max(100),
    updateStock: Joi.boolean().default(true),
    notes: Joi.string(),
    items: Joi.array()
      .items(
        Joi.object({
          productId: Joi.string().uuid().required(),
          quantity: Joi.number().integer().min(1).required(),
          unitPrice: Joi.number().positive().required(),
          taxRate: Joi.number().min(0).max(100).default(16),
          discountRate: Joi.number().min(0).max(100).default(0),
        }),
      )
      .min(1)
      .required(),
  }),

  // UUID parameter validation
  uuidParam: Joi.object({
    id: Joi.string().uuid().required(),
  }),

  // Pagination query validation
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().default("created_at"),
    sortOrder: Joi.string().valid("asc", "desc").default("desc"),
    search: Joi.string().allow(""),
  }),

  // Password update
  passwordUpdate: Joi.object({
    passwordCurrent: Joi.string().required(),
    password: Joi.string().min(6).required(),
    passwordConfirm: Joi.string().valid(Joi.ref("password")).required(),
  }),
  

  // Profile update
  profileUpdate: Joi.object({
    firstName: Joi.string().max(100),
    lastName: Joi.string().max(100),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
    companyName: Joi.string().max(255),
    contactPerson: Joi.string().max(255),
    kraPin: Joi.string().max(50),
    cashbackPhone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/),
  }),
}
