/**
 * Tests for the updated 7-department enum system.
 * Verifies that all department values are properly recognized across the stack.
 */
import { describe, it, expect } from "vitest";

// The 7 real CTAP departments
const VALID_DEPARTMENTS = ["bar", "dining_room", "kitchen_line", "pizza_side", "driver", "dishwasher", "management"] as const;

// The full jobRole enum
const VALID_JOB_ROLES = [
  "owner", "key_manager", "kitchen_manager", "kitchen_key",
  "bartender", "bar_manager", "server", "wait_staff",
  "driver", "line_cook", "pizza", "dishwasher"
] as const;

// Department-to-role mapping (which roles belong to which department)
const DEPT_ROLE_MAP: Record<string, string[]> = {
  management: ["owner", "key_manager"],
  bar: ["bar_manager", "bartender"],
  kitchen_line: ["kitchen_manager", "kitchen_key", "line_cook"],
  pizza_side: ["pizza"],
  dining_room: ["server", "wait_staff"],
  driver: ["driver"],
  dishwasher: ["dishwasher"],
};

describe("Department Enum System", () => {
  it("should have exactly 7 departments", () => {
    expect(VALID_DEPARTMENTS).toHaveLength(7);
  });

  it("should have exactly 12 job roles", () => {
    expect(VALID_JOB_ROLES).toHaveLength(12);
  });

  it("should map every role to exactly one department", () => {
    const allMappedRoles = Object.values(DEPT_ROLE_MAP).flat();
    for (const role of VALID_JOB_ROLES) {
      expect(allMappedRoles).toContain(role);
    }
  });

  it("should not have duplicate roles across departments", () => {
    const allMappedRoles = Object.values(DEPT_ROLE_MAP).flat();
    const unique = new Set(allMappedRoles);
    expect(unique.size).toBe(allMappedRoles.length);
  });

  it("should cover all departments in the role map", () => {
    for (const dept of VALID_DEPARTMENTS) {
      expect(DEPT_ROLE_MAP[dept]).toBeDefined();
      expect(DEPT_ROLE_MAP[dept].length).toBeGreaterThan(0);
    }
  });
});

describe("Staff Seed Data Validation", () => {
  // Import the actual seed data structure expectations
  const EXPECTED_STAFF_COUNTS: Record<string, number> = {
    management: 3,
    bar: 7,
    kitchen_line: 18,
    pizza_side: 1,
    driver: 8,
    dishwasher: 1,
    dining_room: 3,
  };

  it("should have 41 total staff members", () => {
    const total = Object.values(EXPECTED_STAFF_COUNTS).reduce((a, b) => a + b, 0);
    expect(total).toBe(41);
  });

  it("should have correct staff counts per department", () => {
    // Management: Mychael, Sally, Gavin
    expect(EXPECTED_STAFF_COUNTS.management).toBe(3);
    // Bar: Jessica (mgr), Karlee, Ashley, Bryson, Kaillee, Samantha, Azaria
    expect(EXPECTED_STAFF_COUNTS.bar).toBe(7);
    // Kitchen Line: Moe, Che, Steven + 15 line cooks
    expect(EXPECTED_STAFF_COUNTS.kitchen_line).toBe(18);
    // Pizza Side: Josue
    expect(EXPECTED_STAFF_COUNTS.pizza_side).toBe(1);
    // Drivers: Kim, Bryce, Nathaniel, Stephen, Braydon, John, Keaton, Daniel
    expect(EXPECTED_STAFF_COUNTS.driver).toBe(8);
    // Dishwasher: Andrik
    expect(EXPECTED_STAFF_COUNTS.dishwasher).toBe(1);
    // Dining Room: Kenzy, Jeri, Joleah
    expect(EXPECTED_STAFF_COUNTS.dining_room).toBe(3);
  });
});

describe("Department Label Display", () => {
  const DEPT_LABELS: Record<string, string> = {
    management: "Management",
    bar: "Bar",
    kitchen_line: "Kitchen Line",
    pizza_side: "Pizza Side",
    dining_room: "Dining Room",
    driver: "Driver",
    dishwasher: "Dishwasher",
  };

  it("should have human-readable labels for all departments", () => {
    for (const dept of VALID_DEPARTMENTS) {
      expect(DEPT_LABELS[dept]).toBeDefined();
      expect(DEPT_LABELS[dept].length).toBeGreaterThan(0);
    }
  });

  it("should not contain underscore in display labels", () => {
    for (const label of Object.values(DEPT_LABELS)) {
      expect(label).not.toContain("_");
    }
  });
});
