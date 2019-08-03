import { Tsoa } from '../metadataGeneration/tsoa';
import { SwaggerConfig } from './../config';
import { assertNever } from './../utils/assertNever';
import { Swagger } from './swagger';

export class SpecGenerator {
  constructor(protected readonly metadata: Tsoa.Metadata, protected readonly config: SwaggerConfig) { }

  protected buildAdditionalProperties(type: Tsoa.Type) {
    return this.getSwaggerType(type);
  }

  protected buildOperation(controllerName: string, method: Tsoa.Method): Swagger.Operation {
    const swaggerResponses: any = {};

    method.responses.forEach((res: Tsoa.Response) => {
      swaggerResponses[res.name] = {
        description: res.description,
      };
      if (res.schema && res.schema.dataType !== 'void') {
        swaggerResponses[res.name].schema = this.getSwaggerType(res.schema);
      }
      if (res.examples) {
        swaggerResponses[res.name].examples = { 'application/json': res.examples };
      }
    });

    return {
      operationId: this.getOperationId(method.name),
      produces: ['application/json'],
      responses: swaggerResponses,
    };
  }

  protected getOperationId(methodName: string) {
    return methodName.charAt(0).toUpperCase() + methodName.substr(1);
  }

  public throwIfNotDataFormat(strToTest: string): Swagger.DataFormat {
    const guiltyUntilInnocent = strToTest as Swagger.DataFormat;
    if (
        guiltyUntilInnocent === 'int32' ||
        guiltyUntilInnocent === 'int64' ||
        guiltyUntilInnocent === 'float' ||
        guiltyUntilInnocent === 'double' ||
        guiltyUntilInnocent === 'byte' ||
        guiltyUntilInnocent === 'binary' ||
        guiltyUntilInnocent === 'date' ||
        guiltyUntilInnocent === 'date-time' ||
        guiltyUntilInnocent === 'password'
    ) {
        return guiltyUntilInnocent;
    } else {
        return assertNever(guiltyUntilInnocent);
    }
  }

  public throwIfNotDataType(strToTest: string): Swagger.DataType {
    const guiltyUntilInnocent = strToTest as Swagger.DataType;
    if (
        guiltyUntilInnocent === 'array' ||
        guiltyUntilInnocent === 'boolean' ||
        guiltyUntilInnocent === 'integer' ||
        guiltyUntilInnocent === 'number' ||
        guiltyUntilInnocent === 'object' ||
        guiltyUntilInnocent === 'string'
    ) {
        return guiltyUntilInnocent;
    } else {
        return assertNever(guiltyUntilInnocent);
    }
  }

  protected getSwaggerType(type: Tsoa.Type): Swagger.Schema | Swagger.BaseSchema {

    if (type.dataType === 'void'){
        return this.getSwaggerTypeForVoid(type.dataType);
    } else if (type.dataType === 'refEnum' || type.dataType === 'refObject') {
        return this.getSwaggerTypeForReferenceType(type as Tsoa.ReferenceType);
    } else if (
        type.dataType === 'any' ||
        type.dataType === 'binary' ||
        type.dataType === 'boolean' ||
        type.dataType === 'buffer' ||
        type.dataType === 'byte' ||
        type.dataType === 'date' ||
        type.dataType === 'datetime' ||
        type.dataType === 'double' ||
        type.dataType === 'float' ||
        type.dataType === 'integer' ||
        type.dataType === 'long' ||
        type.dataType === 'object' ||
        type.dataType === 'string'
    ) {
        return this.getSwaggerTypeForPrimitiveType(type.dataType);
    } else if (type.dataType === 'array') {
        return this.getSwaggerTypeForArrayType(type as Tsoa.ArrayType);
    } else if (type.dataType === 'enum') {
        return this.getSwaggerTypeForEnumType(type as Tsoa.EnumerateType);
    } else {
        return assertNever(type.dataType);
    }
  }

  protected getSwaggerTypeForReferenceType(referenceType: Tsoa.ReferenceType): Swagger.BaseSchema {
    return {
        // Dont' set additionalProperties value here since it will be set within the modle of the $ref when it gets created
    };
  }

  protected getSwaggerTypeForVoid(dataType: 'void'): Swagger.BaseSchema {
    // Described here: https://swagger.io/docs/specification/describing-responses/#empty
    const voidSchema = {
        // isn't allowed to have additionalProperties at all (meaning not a boolean or object)
    }
    return voidSchema;
  }

  protected getSwaggerTypeForPrimitiveType(dataType: Tsoa.PrimitiveTypeLiteral): Swagger.Schema {

    const defaultAdditionalPropertiesSetting = true;

    if (dataType === 'object') {
      if (process.env.NODE_ENV !== 'tsoa_test') {
        // tslint:disable-next-line: no-console
        console.warn(`The type Object is discouraged. Please consider using an interface such as:
              export interface IStringToStringDictionary {
                  [key: string]: string;
              }
              // or
              export interface IRecordOfAny {
                [key: string]: any;
              }
        `);
      }
    }

    const map: Record<Tsoa.PrimitiveTypeLiteral, Swagger.Schema> = {
      any: {
        // While the any type is discouraged, it does explicitly allows anything, so it should always allow additionalProperties
        additionalProperties: true,
        type: 'object',
      },
      binary: { type: 'string', format: 'binary' },
      boolean: { type: 'boolean' },
      buffer: { type: 'string', format: 'byte' },
      byte: { type: 'string', format: 'byte' },
      date: { type: 'string', format: 'date' },
      datetime: { type: 'string', format: 'date-time' },
      double: { type: 'number', format: 'double' },
      float: { type: 'number', format: 'float' },
      integer: { type: 'integer', format: 'int32' },
      long: { type: 'integer', format: 'int64' },
      object: {
        additionalProperties: this.config.noImplicitAdditionalProperties ? false : defaultAdditionalPropertiesSetting,
        type: 'object',
      },
      string: { type: 'string' },
    };

    return map[dataType];
  }

  protected getSwaggerTypeForArrayType(arrayType: Tsoa.ArrayType): Swagger.Schema {
    return {
      items: this.getSwaggerType(arrayType.elementType),
      type: 'array',
    };
  }

  protected getSwaggerTypeForEnumType(enumType: Tsoa.EnumerateType): Swagger.Schema {
    return { type: 'string', enum: enumType.enums.map(member => String(member)) };
  }
}
