// verticalConfig.js
// Configuration for dynamic terminology based on property_type

const verticalConfigs = {
  RESIDENTIAL: {
    propertyLabel: 'Property',
    propertiesLabel: 'Properties',
    unitLabel: 'Unit',
    unitsLabel: 'Units',
    occupantLabel: 'Tenant',
    occupantsLabel: 'Tenants',
    agreementLabel: 'Lease',
    agreementsLabel: 'Leases',
    billingCycleDefault: 'MONTHLY',
    canHaveMultipleOccupants: false,
  },
  HOTEL: {
    propertyLabel: 'Hotel',
    propertiesLabel: 'Hotels',
    unitLabel: 'Room',
    unitsLabel: 'Rooms',
    occupantLabel: 'Guest',
    occupantsLabel: 'Guests',
    agreementLabel: 'Reservation',
    agreementsLabel: 'Reservations',
    billingCycleDefault: 'DAILY',
    canHaveMultipleOccupants: true,
  },
  HOSPITAL: {
    propertyLabel: 'Hospital',
    propertiesLabel: 'Hospitals',
    unitLabel: 'Bed',
    unitsLabel: 'Beds',
    occupantLabel: 'Patient',
    occupantsLabel: 'Patients',
    agreementLabel: 'Admission',
    agreementsLabel: 'Admissions',
    billingCycleDefault: 'DAILY',
    canHaveMultipleOccupants: false,
  },
  COMMERCIAL: {
    propertyLabel: 'Plaza',
    propertiesLabel: 'Plazas',
    unitLabel: 'Shop',
    unitsLabel: 'Shops',
    occupantLabel: 'Merchant',
    occupantsLabel: 'Merchants',
    agreementLabel: 'Contract',
    agreementsLabel: 'Contracts',
    billingCycleDefault: 'MONTHLY',
    canHaveMultipleOccupants: false,
  },
  COWORKING: {
    propertyLabel: 'Space',
    propertiesLabel: 'Spaces',
    unitLabel: 'Desk',
    unitsLabel: 'Desks',
    occupantLabel: 'Member',
    occupantsLabel: 'Members',
    agreementLabel: 'Membership',
    agreementsLabel: 'Memberships',
    billingCycleDefault: 'MONTHLY',
    canHaveMultipleOccupants: true,
  },
  WAREHOUSE: {
    propertyLabel: 'Warehouse',
    propertiesLabel: 'Warehouses',
    unitLabel: 'Bay',
    unitsLabel: 'Bays',
    occupantLabel: 'Client',
    occupantsLabel: 'Clients',
    agreementLabel: 'Storage Contract',
    agreementsLabel: 'Storage Contracts',
    billingCycleDefault: 'MONTHLY',
    canHaveMultipleOccupants: false,
  }
};

/**
 * Returns the terminology configuration for a given property type.
 * @param {string} type - The property_type (e.g., 'RESIDENTIAL', 'HOTEL')
 * @returns {object} Terminology dictionary
 */
export function getVerticalConfig(type = 'RESIDENTIAL') {
  return verticalConfigs[type] || verticalConfigs.RESIDENTIAL;
}
