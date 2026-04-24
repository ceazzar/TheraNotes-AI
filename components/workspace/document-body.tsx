"use client";

import { PARTICIPANT } from "@/lib/workspace/sample-data";
import type { Flag, FlagPreview } from "@/lib/workspace/sample-data";
import { FlagSpan } from "./flag-span";

interface DocumentBodyProps {
  flags: Record<string, Flag>;
  previews: Record<string, FlagPreview>;
  onOpenFlag: (id: string, el: HTMLElement) => void;
  onAcceptPreview: (flagId: string) => void;
  onRejectPreview: (flagId: string) => void;
}

export function DocumentBody({
  flags,
  previews,
  onOpenFlag,
  onAcceptPreview,
  onRejectPreview,
}: DocumentBodyProps) {
  const F = (flag: Flag | undefined) => {
    if (!flag) return null;
    const replaced = previews[flag.id];
    return (
      <FlagSpan
        flag={flag}
        replaced={replaced}
        onOpen={onOpenFlag}
        onAccept={() => onAcceptPreview(flag.id)}
        onReject={() => onRejectPreview(flag.id)}
      />
    );
  };

  return (
    <div className="tn-doc">
      <h1>Functional Capacity Assessment</h1>
      <div className="tn-doc-subhead">
        NDIS Access &amp; Plan Review Evidence &middot; Prepared by{" "}
        {PARTICIPANT.assessor} &middot; {PARTICIPANT.reportDate}
      </div>

      {/* Part A */}
      <div data-section-anchor="a" />
      <h2>Part A &mdash; About the Participant</h2>
      <div className="tn-doc-participant">
        <dl>
          <dt>Name</dt>
          <dd>{PARTICIPANT.name}</dd>
          <dt>NDIS no.</dt>
          <dd>{PARTICIPANT.ndisNumber}</dd>
          <dt>Date of birth</dt>
          <dd>{PARTICIPANT.dob}</dd>
          <dt>Address</dt>
          <dd>{PARTICIPANT.address}</dd>
          <dt>Assessor</dt>
          <dd>{PARTICIPANT.assessor}</dd>
          <dt>AHPRA no.</dt>
          <dd>{PARTICIPANT.ahpra}</dd>
          <dt>Assessment date</dt>
          <dd>{PARTICIPANT.assessmentDate}</dd>
          <dt>Report date</dt>
          <dd>{PARTICIPANT.reportDate}</dd>
        </dl>
      </div>

      <h3>Primary diagnoses</h3>
      <p>
        {PARTICIPANT.diagnoses}. The participant resides independently in a
        one-bedroom rental property and is in receipt of a Disability Support
        Pension. They are not currently employed.
      </p>

      <h3>Background &amp; context</h3>
      <p>
        The participant sustained an acquired brain injury in a 2018
        motor-vehicle incident, with documented sequelae affecting executive
        functioning, fatigue regulation, and emotional self-regulation. Chronic
        lower-back pain has emerged over the past four years and is managed
        conservatively under a general-practitioner-led plan. The participant{" "}
        {F(flags.f1)} their morning routine but reports that complex multi-step
        tasks, particularly those involving time pressure, result in
        disproportionate fatigue by mid-afternoon.
      </p>

      <h3>Participant goals</h3>
      <ul>
        <li>
          Increase consistent, independent community access (shopping,
          appointments, social).
        </li>
        <li>
          Return to suitable part-time employment within 12&ndash;18 months.
        </li>
        <li>
          Sustain tenancy in the current rental property without crisis-driven
          moves.
        </li>
      </ul>

      {/* Part B */}
      <div data-section-anchor="b" />
      <h2>Part B &mdash; Mental Health &amp; Psychosocial</h2>
      <p>{F(flags.f3)}</p>
      <h3>Supports in place</h3>
      <p>
        Fortnightly sessions with a clinical psychologist (Medicare Mental
        Health Treatment Plan), and quarterly review with the treating GP. No
        current NDIS-funded psychosocial recovery coach.
      </p>
      <h3>Risk factors</h3>
      <ul>
        <li>Social isolation on days without scheduled activity.</li>
        <li>
          Fatigue-driven withdrawal from planned appointments (observed
          2&ndash;3 days/week).
        </li>
        <li>Low confidence initiating unfamiliar community tasks.</li>
      </ul>

      {/* Part C */}
      <div data-section-anchor="c" />
      <h2>Part C &mdash; Functional Impairments</h2>

      <h3>Activities of Daily Living</h3>
      <p>
        {F(flags.f5)} were assessed via direct observation across two home
        visits on 14 and 17 April 2026. The participant {F(flags.f4)}.
        Showering is completed with supervision for safety on days of high
        fatigue; transfers are independent over short distances. Medication is
        managed via a Webster-pak prepared by the treating pharmacist.
      </p>

      <table>
        <thead>
          <tr>
            <th>Domain</th>
            <th>Observed performance</th>
            <th>Level of assistance</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Showering &amp; personal hygiene</td>
            <td>Safe with supervision on fatigue days</td>
            <td>Standby / supervision</td>
          </tr>
          <tr>
            <td>Dressing</td>
            <td>Independent, slow</td>
            <td>Nil</td>
          </tr>
          <tr>
            <td>Toileting</td>
            <td>Independent</td>
            <td>Nil</td>
          </tr>
          <tr>
            <td>Meal preparation</td>
            <td>
              Simple meals independent; hot multi-step meals require assistance
            </td>
            <td>Moderate</td>
          </tr>
          <tr>
            <td>Domestic tasks</td>
            <td>Laundry &amp; surface cleaning requires prompting</td>
            <td>Supervision + prompting</td>
          </tr>
        </tbody>
      </table>

      <h3>Community participation</h3>
      <p>
        Community access is a significant area of functional limitation.{" "}
        <span>{F(flags.f2)}</span>. The participant reports avoiding unfamiliar
        public transport routes and requires a familiar support person to attend
        the majority of appointments.{" "}
        <span className="tn-insuf">[INSUFFICIENT DATA]</span> was flagged
        against transport-specific training history; clarification was requested
        and is pending.
      </p>

      <h3>Cognitive &amp; sensory</h3>
      <p>
        Executive-function screening (MoCA 24/30) identifies deficits in
        attention and delayed recall. Sensory profile completed 17 Apr 2026
        indicates hyper-responsiveness to auditory input in busy environments,
        contributing to withdrawal from community venues.
      </p>

      {/* Part D */}
      <div data-section-anchor="d" />
      <h2>Part D &mdash; Assessment Findings</h2>

      <h3>Standardised measures</h3>
      <table>
        <thead>
          <tr>
            <th>Measure</th>
            <th>Score</th>
            <th>Interpretation</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>WHODAS 2.0 &mdash; Total</td>
            <td>62 / 100</td>
            <td>Severe disability</td>
          </tr>
          <tr>
            <td>WHODAS 2.0 &mdash; D5 Participation</td>
            <td>68</td>
            <td>Severe restriction</td>
          </tr>
          <tr>
            <td>FIM Self-Care</td>
            <td>3</td>
            <td>Moderate assistance</td>
          </tr>
          <tr>
            <td>MoCA</td>
            <td>24 / 30</td>
            <td>Mild cognitive impairment</td>
          </tr>
          <tr>
            <td>Sensory Profile (adult) &mdash; Auditory</td>
            <td>High</td>
            <td>Hyper-responsive</td>
          </tr>
        </tbody>
      </table>

      <h3>Clinical formulation</h3>
      <p>
        The combination of ABI-related cognitive fatigue, moderate self-care
        impairment, and hyper-responsive sensory profile produces a compounding
        impact on community participation. Evidence supports {F(flags.f6)} to
        enable sustained community access and protect tenancy.
      </p>

      {/* Part E */}
      <div data-section-anchor="e" />
      <h2>Part E &mdash; Summary &amp; Recommendations</h2>

      <h3>Summary</h3>
      <p>
        The participant has a permanent, significant functional impairment
        across self-care, community participation, and psychosocial domains,
        consistent with NDIS Access criteria. Capacity-building supports will
        materially reduce the level of ongoing funded assistance required, on a
        12&ndash;24 month horizon.
      </p>

      <h3>Recommendations</h3>
      <ol style={{ paddingLeft: 24, margin: 0 }}>
        <li>
          <b>Support worker &mdash;</b> 8 hours per week (5h community access,
          3h domestic).
        </li>
        <li>
          <b>Occupational therapy review &mdash;</b> 6 hours / 6 months,
          focussed on sensory strategies and transport training.
        </li>
        <li>
          <b>Psychosocial recovery coach &mdash;</b> 2 hours / week for 12
          months, tapering.
        </li>
        <li>
          <b>Assistive technology &mdash;</b> noise-attenuating headphones and
          shower-stool assessment.
        </li>
      </ol>

      <p style={{ marginTop: 20 }}>{F(flags.f7)}</p>

      <p
        style={{
          marginTop: 28,
          color: "var(--tn-muted-1)",
          fontSize: 13,
        }}
      >
        <em>Assessor declaration:</em> I confirm this report reflects my
        professional clinical opinion based on the assessment undertaken on the
        dates stated, and that the participant has provided informed consent for
        its release to the NDIA.
      </p>
    </div>
  );
}
