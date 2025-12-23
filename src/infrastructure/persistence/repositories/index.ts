/**
 * Repositories - Export all repository implementations
 */

export {
  ResourceRepository,
  createResourceRepository,
  type IResourceRepository,
  type Transaction,
} from './ResourceRepository.js';

export {
  ReservationRepository,
  createReservationRepository,
  type IReservationRepository,
} from './ReservationRepository.js';

export {
  SettingsRepository,
  type MaintenanceStatus,
} from './SettingsRepository.js';

export {
  resourceToDomain,
  resourceToDbInsert,
  resourceToDbUpdate,
  reservationToDomain,
  reservationToDbInsert,
  reservationToDbUpdate,
} from './mappers.js';
