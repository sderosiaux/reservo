/**
 * Value Objects - Immutable domain primitives
 */

export {
  type ResourceId,
  createResourceId,
  isResourceId
} from './ResourceId.js';

export {
  type ClientId,
  createClientId,
  isClientId
} from './ClientId.js';

export {
  type ReservationId,
  createReservationId,
  generateReservationId,
  isReservationId
} from './ReservationId.js';

export {
  type Quantity,
  createQuantity,
  isQuantity
} from './Quantity.js';
