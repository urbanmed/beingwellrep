-- Reset the document status to trigger reprocessing with our enhanced logic
UPDATE reports 
SET parsing_status = 'pending', 
    parsed_data = null,
    confidence_score = null
WHERE id = '5589e978-fa02-4d20-bdac-b8f6822d3686';