"use strict";
/*
 * SPDX-License-Identifier: MIT
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionFromParts = exports.formatPermission = exports.ALL_PERMISSIONS = exports.PERMISSIONS = void 0;
exports.PERMISSIONS = {
    sites: {
        read: 'sites.read',
        manage: 'sites.manage',
    },
    assets: {
        read: 'assets.read',
        write: 'assets.write',
        delete: 'assets.delete',
    },
    workOrders: {
        read: 'workorders.read',
        write: 'workorders.write',
        approve: 'workorders.approve',
    },
    workRequests: {
        read: 'workrequests.read',
        convert: 'workrequests.convert',
    },
    roles: {
        read: 'roles.read',
        manage: 'roles.manage',
    },
    hierarchy: {
        read: 'hierarchy.read',
        write: 'hierarchy.write',
        delete: 'hierarchy.delete',
    },
    inventory: {
        read: 'inventory.read',
        manage: 'inventory.manage',
        purchase: 'inventory.purchase',
    },
    pm: {
        read: 'pm.read',
        write: 'pm.write',
        delete: 'pm.delete',
    },
    importExport: {
        import: 'importexport.import',
        export: 'importexport.export',
    },
    executive: {
        read: 'executive.read',
        manage: 'executive.manage',
    },
    reports: {
        read: 'reports.read',
        build: 'reports.build',
        export: 'reports.export',
    },
    audit: {
        read: 'audit.read',
    },
    integrations: {
        read: 'integrations.read',
        manage: 'integrations.manage',
    },
};
const permissionValues = Object.values(exports.PERMISSIONS).flatMap((group) => Object.values(group));
exports.ALL_PERMISSIONS = Array.from(new Set(permissionValues));
const formatPermission = (scope, action) => {
    const normalizedScope = scope.trim();
    const key = action ? `${normalizedScope}.${action}` : normalizedScope;
    return key.toLowerCase();
};
exports.formatPermission = formatPermission;
const permissionFromParts = (scope, action) => (0, exports.formatPermission)(scope, action);
exports.permissionFromParts = permissionFromParts;
