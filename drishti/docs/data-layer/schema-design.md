# DRISHTI — Data Layer Schema (Module 1)

Source: Police FIR System ER Diagram (Karnataka Police Department).
Target: **Catalyst Data Store** (relational). Tables must be created manually
in the Catalyst console (Data Store → Create a new Table) — this doc is the
spec to follow while doing that.

> Naming rule: table/column names use only alphanumeric characters and
> underscores, no leading digits (Catalyst constraint).

## Build order

Create tables in this order so foreign keys always point at something that
already exists.

1. Master/reference tables (no dependencies)
2. `Employee`, `Unit`, `Court` (depend on masters)
3. `CaseMaster` (depends on the above)
4. Case-linked tables (`ComplainantDetails`, `Victim`, `Accused`,
   `ArrestSurrender`, `ChargesheetDetails`, `ActSectionAssociation`)

---

## 1. Master / reference tables

### State
| Column | Type | Key | Notes |
|---|---|---|---|
| StateID | AUTONUMBER | PK | |
| StateName | VARCHAR | | |
| NationalityID | BIGINT | | |
| Active | CHECKBOX | | default true |

### District
| Column | Type | Key | Notes |
|---|---|---|---|
| DistrictID | AUTONUMBER | PK | |
| DistrictName | VARCHAR | | |
| StateID | BIGINT | FK → State.StateID | |
| Active | CHECKBOX | | |

### UnitType
| Column | Type | Key | Notes |
|---|---|---|---|
| UnitTypeID | AUTONUMBER | PK | |
| UnitTypeName | VARCHAR | | e.g. Police Station, Circle Office |
| CityDistState | VARCHAR | | City / District / State |
| Hierarchy | BIGINT | | lower = higher authority |
| Active | CHECKBOX | | |

### Rank
| Column | Type | Key | Notes |
|---|---|---|---|
| RankID | AUTONUMBER | PK | |
| RankName | VARCHAR | | |
| Hierarchy | BIGINT | | lower = higher rank |
| Active | CHECKBOX | | |

### Designation
| Column | Type | Key | Notes |
|---|---|---|---|
| DesignationID | AUTONUMBER | PK | |
| DesignationName | VARCHAR | | |
| SortOrder | BIGINT | | |
| Active | CHECKBOX | | |

### CaseCategory
| Column | Type | Key | Notes |
|---|---|---|---|
| CaseCategoryID | AUTONUMBER | PK | |
| LookupValue | VARCHAR | | FIR, UDR, PAR, Zero FIR |

### GravityOffence
| Column | Type | Key | Notes |
|---|---|---|---|
| GravityOffenceID | AUTONUMBER | PK | |
| LookupValue | VARCHAR | | Heinous / Non-Heinous |

### CaseStatusMaster
| Column | Type | Key | Notes |
|---|---|---|---|
| CaseStatusID | AUTONUMBER | PK | |
| CaseStatusName | VARCHAR | | Under Investigation, Charge Sheeted, Closed |

### CrimeHead
| Column | Type | Key | Notes |
|---|---|---|---|
| CrimeHeadID | AUTONUMBER | PK | |
| CrimeGroupName | VARCHAR | | e.g. Crimes Against Body |
| Active | CHECKBOX | | |

### CrimeSubHead
| Column | Type | Key | Notes |
|---|---|---|---|
| CrimeSubHeadID | AUTONUMBER | PK | |
| CrimeHeadID | BIGINT | FK → CrimeHead.CrimeHeadID | |
| CrimeHeadName | VARCHAR | | e.g. Murder, Robbery |
| SeqID | BIGINT | | sort order |

### Act
| Column | Type | Key | Notes |
|---|---|---|---|
| ActCode | VARCHAR | PK | e.g. IPC, NDPS |
| ActDescription | VARCHAR | | |
| ShortName | VARCHAR | | |
| Active | CHECKBOX | | |

### Section
| Column | Type | Key | Notes |
|---|---|---|---|
| SectionCode | VARCHAR | PK | e.g. 302, 307 |
| ActCode | VARCHAR | FK → Act.ActCode | |
| SectionDescription | VARCHAR | | |
| Active | CHECKBOX | | |

### CrimeHeadActSection
| Column | Type | Key | Notes |
|---|---|---|---|
| CrimeHeadID | BIGINT | FK → CrimeHead.CrimeHeadID | |
| ActCode | VARCHAR | FK → Act.ActCode | |
| SectionCode | VARCHAR | FK → Section.SectionCode | |

### CasteMaster / ReligionMaster / OccupationMaster
Same shape for all three — `<x>_id` (AUTONUMBER, PK) + `<x>Name` (VARCHAR).
These stay lookup-only; never expose them as filters/analytics dimensions
in the UI (see privacy note at the bottom).

### Court
| Column | Type | Key | Notes |
|---|---|---|---|
| CourtID | AUTONUMBER | PK | |
| CourtName | VARCHAR | | |
| DistrictID | BIGINT | FK → District.DistrictID | |
| StateID | BIGINT | FK → State.StateID | |
| Active | CHECKBOX | | |

### Unit
| Column | Type | Key | Notes |
|---|---|---|---|
| UnitID | AUTONUMBER | PK | |
| UnitName | VARCHAR | | |
| TypeID | BIGINT | FK → UnitType.UnitTypeID | |
| ParentUnit | BIGINT | self-ref → Unit.UnitID | |
| StateID | BIGINT | FK → State.StateID | |
| DistrictID | BIGINT | FK → District.DistrictID | |
| Active | CHECKBOX | | |

### Employee
| Column | Type | Key | Notes |
|---|---|---|---|
| EmployeeID | AUTONUMBER | PK | |
| DistrictID | BIGINT | FK → District.DistrictID | |
| UnitID | BIGINT | FK → Unit.UnitID | |
| RankID | BIGINT | FK → Rank.RankID | |
| DesignationID | BIGINT | FK → Designation.DesignationID | |
| KGID | VARCHAR | | govt employee number |
| FirstName | VARCHAR | | |
| EmployeeDOB | DATETIME | | |
| GenderID | BIGINT | | lookup |
| AppointmentDate | DATETIME | | |

---

## 2. Case tables

### CaseMaster (hub table)
| Column | Type | Key | Notes |
|---|---|---|---|
| CaseMasterID | AUTONUMBER | PK | |
| CrimeNo | VARCHAR | | structured format, see source doc |
| CaseNo | VARCHAR | | |
| CrimeRegisteredDate | DATETIME | | |
| PolicePersonID | BIGINT | FK → Employee.EmployeeID | |
| PoliceStationID | BIGINT | FK → Unit.UnitID | |
| CaseCategoryID | BIGINT | FK → CaseCategory.CaseCategoryID | |
| GravityOffenceID | BIGINT | FK → GravityOffence.GravityOffenceID | |
| CrimeMajorHeadID | BIGINT | FK → CrimeHead.CrimeHeadID | |
| CrimeMinorHeadID | BIGINT | FK → CrimeSubHead.CrimeSubHeadID | |
| CaseStatusID | BIGINT | FK → CaseStatusMaster.CaseStatusID | |
| CourtID | BIGINT | FK → Court.CourtID | |
| IncidentFromDate | DATETIME | | |
| IncidentToDate | DATETIME | | |
| InfoReceivedPSDate | DATETIME | | |
| latitude | DOUBLE | | |
| longitude | DOUBLE | | |
| BriefFacts | VARCHAR(MAX) | | |

### ComplainantDetails
CaseMasterID (FK), ComplainantName, AgeYear, OccupationID (FK), ReligionID (FK),
CasteID (FK), GenderID.
**Privacy**: ReligionID/CasteID are stored for schema fidelity to the source
doc but should never be surfaced in DRISHTI's analytics/UI (see note below).

### Victim
VictimMasterID (PK), CaseMasterID (FK), VictimName, AgeYear, GenderID, VictimPolice.

### Accused
AccusedMasterID (PK), CaseMasterID (FK), AccusedName, AgeYear, GenderID, PersonID (A1, A2…).

### ArrestSurrender
ArrestSurrenderID (PK), CaseMasterID (FK), ArrestSurrenderTypeID, ArrestSurrenderDate,
ArrestSurrenderStateId (FK), ArrestSurrenderDistrictId (FK), PoliceStationID (FK),
IOID (FK → Employee), CourtID (FK), AccusedMasterID (FK), IsAccused, IsComplainantAccused.

### ChargesheetDetails
CSID (PK), CaseMasterID (FK), csdate, cstype (A=Chargesheet, B=False Case, C=Undetected),
PolicePersonID (FK → Employee).

### ActSectionAssociation
CaseMasterID (FK), ActID (FK → Act.ActCode), SectionID (FK → Section.SectionCode),
ActOrderID, SectionOrderID.

---

## Privacy / demo-data rule

- No real case data goes in this repo — `data/seed-data/` contains synthetic
  records only.
- CasteID / ReligionID exist in the schema for fidelity to the official ER
  diagram, but DRISHTI's product surface (dashboards, hotspot maps, the
  conversational assistant) should never use them as an analysis dimension.