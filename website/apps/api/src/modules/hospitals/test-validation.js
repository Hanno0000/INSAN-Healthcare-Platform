const { validateSync } = require('class-validator');
const { plainToInstance } = require('class-transformer');
const { CreateHospitalDto } = require('./dto/create-hospital.dto');

const payload = {
  slug: "test-hospital",
  name: { ar: "Test", en: "Test" },
  departments: [
    { slug: "test", name: { ar: "Test", en: "" } }
  ]
};

const instance = plainToInstance(CreateHospitalDto, payload, { enableImplicitConversion: true });
const errors = validateSync(instance, { whitelist: true, forbidNonWhitelisted: false });

console.log("Instance after validation/transform:");
console.dir(instance, { depth: null });
console.log("Errors:");
console.dir(errors, { depth: null });
