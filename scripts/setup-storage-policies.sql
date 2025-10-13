-- Políticas RLS para el bucket 'label-assets'
-- Estas políticas permiten a usuarios autenticados subir, leer, actualizar y eliminar archivos

-- Política para permitir subida de archivos (INSERT)
CREATE POLICY "Usuarios autenticados pueden subir archivos a label-assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'label-assets');

-- Política para permitir lectura de archivos (SELECT)
CREATE POLICY "Todos pueden leer archivos de label-assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'label-assets');

-- Política para permitir actualización de archivos (UPDATE)
CREATE POLICY "Usuarios autenticados pueden actualizar archivos en label-assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'label-assets')
WITH CHECK (bucket_id = 'label-assets');

-- Política para permitir eliminación de archivos (DELETE)
CREATE POLICY "Usuarios autenticados pueden eliminar archivos de label-assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'label-assets');