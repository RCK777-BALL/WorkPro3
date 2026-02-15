"use strict";
/*
 * SPDX-License-Identifier: MIT
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleHierarchy = exports.AUTH_ROLES = void 0;
const roleHierarchy_json_1 = __importDefault(require("../auth/roleHierarchy.json"));
exports.AUTH_ROLES = [
    'global_admin',
    'plant_admin',
    'general_manager',
    'assistant_general_manager',
    'operations_manager',
    'assistant_department_leader',
    'technical_team_member',
    'asset_viewer',
    'asset_coordinator',
    'workorder_requester',
    'workorder_supervisor',
    'dispatcher',
    'inventory_controller',
    'report_builder',
    'site_supervisor',
    'department_tech',
    'admin',
    'supervisor',
    'manager',
    'planner',
    'tech',
    'technician',
    'team_member',
    'team_leader',
    'area_leader',
    'department_leader',
    'viewer',
    'buyer',
    'finance',
];
exports.roleHierarchy = roleHierarchy_json_1.default;
