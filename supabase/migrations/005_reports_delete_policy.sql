-- Allow users to delete their own reports.
-- Related corrections keep their history with report_id set to NULL.
CREATE POLICY reports_delete ON public.reports
  FOR DELETE USING (user_id = (SELECT auth.uid()));
