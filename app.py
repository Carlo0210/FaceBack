from flask import Flask, request, jsonify
from flask_uploads import UploadSet, IMAGES, configure_uploads
from PIL import Image
import os
from io import BytesIO
import face_recognition

app = Flask(__name__)

photos = UploadSet('photos', IMAGES)
app.config['UPLOADED_PHOTOS_DEST'] = 'uploads'
configure_uploads(app, photos)


@app.route('/post-face', methods=['POST'])
def post_face():
    try:
        eventId = request.form['eventId']
        name = request.form['name']
        school = request.form['school']
        email = request.form['email']

        if 'image' not in request.files:
            return jsonify(message='No image uploaded'), 400

        image = request.files['image']
        image_path = os.path.join(app.config['UPLOADED_PHOTOS_DEST'], image.filename)
        image.save(image_path)

        image = Image.open(image_path)
        face_locations = face_recognition.face_locations(image)
        face_landmarks = face_recognition.face_landmarks(image)
        face_descriptors = face_recognition.face_encodings(image, face_locations)

        if not face_descriptors:
            os.remove(image_path)
            return jsonify(message='No face detected in the image'), 400

        # Check if a similar face already exists in the database
        # Add your database interaction logic here

        # Save data to MongoDB, including faceDescriptions and distances
        # Add your MongoDB interaction logic here

        os.remove(image_path)

        return jsonify(message='Face added successfully'), 201

    except Exception as e:
        print(e)
        return jsonify(message='Internal Server Error'), 500


@app.route('/compare-faces', methods=['POST'])
def compare_faces():
    try:
        if 'image' not in request.files:
            return jsonify(message='No image uploaded'), 400

        image = request.files['image']
        image_path = os.path.join(app.config['UPLOADED_PHOTOS_DEST'], image.filename)
        image.save(image_path)

        image = Image.open(image_path)
        detected_face_locations = face_recognition.face_locations(image)
        detected_face_descriptors = face_recognition.face_encodings(image, detected_face_locations)

        if not detected_face_descriptors:
            os.remove(image_path)
            return jsonify(message='No face detected in the image'), 400

        # Retrieve faces from MongoDB
        eventId = request.form['eventId']
        # Add your MongoDB interaction logic here

        # Define a threshold for similarity
        similarity_threshold = 0.6

        # Calculate distances and filter based on similarity
        results = []
        # Add your face comparison logic here

        # Remove the uploaded image
        os.remove(image_path)

        if not results:
            return jsonify(message='This face is not registered for the specific event'), 400

        return jsonify(message='This face is completely verified', results=results), 200

    except Exception as e:
        print(e)
        return jsonify(message='Internal Server Error'), 500


if __name__ == '__main__':
    app.run(debug=True)
