-- Allow clients to delete their own pending service requests
CREATE POLICY "Clients can delete their own pending requests"
ON public.service_requests
FOR DELETE
TO authenticated
USING (
  status = 'pending' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = service_requests.client_id 
    AND profiles.user_id = auth.uid()
  )
);