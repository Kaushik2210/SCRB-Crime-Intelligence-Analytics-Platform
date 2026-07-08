"use client";

import Link from "next/link";
import { format } from "date-fns";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/ui/badge";

// Column defs live in a client component because they carry `render`
// functions — those can't cross the server/client boundary as props from a
// Server Component (see components/shared/KpiCard.jsx for the same fix).
const columns = [
  { key: "crimeNo", header: "Crime No." },
  { key: "subHeadName", header: "Crime Type" },
  {
    key: "gravityName",
    header: "Gravity",
    render: (row) => (
      <Badge variant={row.gravityName === "Heinous" ? "destructive" : "secondary"}>{row.gravityName}</Badge>
    ),
  },
  {
    key: "statusName",
    header: "Status",
    render: (row) => <Badge variant="secondary">{row.statusName}</Badge>,
  },
  {
    key: "districtName",
    header: "Location",
    render: (row) =>
      row.districtId ? (
        <Link href={`/districts/${row.districtId}`} className="text-primary hover:underline">
          {row.unitName}
        </Link>
      ) : (
        row.unitName
      ),
  },
  {
    key: "registeredDate",
    header: "Registered",
    render: (row) => format(new Date(row.registeredDate), "dd MMM yyyy"),
  },
];

export function CasesTable({ data }) {
  return (
    <DataTable
      columns={columns}
      data={data}
      searchKeys={["crimeNo", "caseNo", "subHeadName", "unitName", "districtName"]}
      emptyMessage="No cases in scope yet."
    />
  );
}
