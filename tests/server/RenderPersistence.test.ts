import { load } from "js-yaml";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

type Blueprint = {
  databases?: Array<{
    name?: string;
    plan?: string;
    ipAllowList?: unknown[];
  }>;
  services?: Array<{
    name?: string;
    healthCheckPath?: string;
    envVars?: Array<{
      key?: string;
      value?: string;
      fromDatabase?: { name?: string; property?: string };
    }>;
  }>;
};

describe("Render production persistence", () => {
  test("binds the production service to durable PostgreSQL", () => {
    const blueprint = load(
      fs.readFileSync(path.resolve("render.yaml"), "utf8"),
    ) as Blueprint;
    const database = blueprint.databases?.find(
      (candidate) => candidate.name === "openback-postgres",
    );
    const service = blueprint.services?.find(
      (candidate) => candidate.name === "openback",
    );
    const env = new Map(service?.envVars?.map((entry) => [entry.key, entry]));

    expect(database?.plan).toBe("basic-256mb");
    expect(database?.ipAllowList).toEqual([]);
    expect(env.get("GAME_ENV")?.value).toBe("prod");
    expect(env.get("DATABASE_URL")?.fromDatabase).toEqual({
      name: "openback-postgres",
      property: "connectionString",
    });
    expect(service?.healthCheckPath).toBe("/auth/health");
  });

  test("supervisor can stop every managed process during a Render restart", () => {
    const supervisor = fs.readFileSync(
      path.resolve("supervisord.conf"),
      "utf8",
    );
    const managedUsers = [...supervisor.matchAll(/^user=(.+)$/gm)].map(
      (match) => match[1].trim(),
    );

    expect(new Set(managedUsers)).toEqual(new Set(["root"]));
  });
});
